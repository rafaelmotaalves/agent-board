import { describe, it, expect, beforeEach, afterEach, jest, mock } from "bun:test";
import { Database } from "bun:sqlite";
import { TaskService } from "@/lib/taskService";
import { TaskWorker } from "@/lib/worker";
import type { AgentPool } from "@/lib/agents";
import type { IAgentCaller } from "@/lib/agents";
import type { AgentOptions } from "@/lib/types";

// Mock the streaming store so tests don't perform real file I/O
mock.module("@/lib/streamingStore", () => ({
  initStreamingFile: () => {},
  appendStreamingChunk: () => {},
  finalizeStreamingFile: () => Promise.resolve(),
  deleteStreamingFile: () => {},
  cleanupAllStreamingFiles: () => {},
  streamingFileExists: () => false,
  getStreamingFilePath: () => "",
  readStreamingContent: () => null,
}));

const AGENT_DELAY_MS = 10000;

/** Fake caller whose async methods resolve only after AGENT_DELAY_MS (fake-timer controlled). */
function createMockCaller(): IAgentCaller {
  return {
    planTask: () => new Promise((res) => setTimeout(() => res("mock plan"), AGENT_DELAY_MS)),
    executeTask: () => new Promise((res) => setTimeout(() => res("mock execution"), AGENT_DELAY_MS)),
    sendMessage: () => new Promise((res) => setTimeout(() => res("mock response"), AGENT_DELAY_MS)),
  };
}

/** Fake caller whose methods reject with the given error message. */
function createFailingCaller(errorMessage = "agent unavailable"): IAgentCaller {
  return {
    planTask: () => new Promise((_, rej) => setTimeout(() => rej(new Error(errorMessage)), AGENT_DELAY_MS)),
    executeTask: () => new Promise((_, rej) => setTimeout(() => rej(new Error(errorMessage)), AGENT_DELAY_MS)),
    sendMessage: () => new Promise((_, rej) => setTimeout(() => rej(new Error(errorMessage)), AGENT_DELAY_MS)),
  };
}

function createFailingAgentPool(errorMessage?: string): AgentPool {
  const caller = createFailingCaller(errorMessage);
  return {
    get: () => Promise.resolve(caller),
    getAgentOptions: () => ({}),
  } as unknown as AgentPool;
}

/**
 * Mock AgentPool — get() resolves synchronously (via microtask) with a mock caller.
 * getAgentOptions() returns configurable options for agent ID 1.
 */
function createMockAgentPool(agentOptions?: AgentOptions): AgentPool {
  const caller = createMockCaller();
  return {
    get: () => Promise.resolve(caller),
    getAgentOptions: () => agentOptions ?? {},
  } as unknown as AgentPool;
}

/** Flush the microtask queue enough times for chained promise resolutions to propagate. */
async function flushMicrotasks() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

/** Helper: get the single processing task ID for a status, or undefined. */
function getProcessingId(worker: TaskWorker, status: string): number | undefined {
  const set = worker.getProcessingTasks().get(status);
  if (!set || set.size === 0) return undefined;
  return set.values().next().value;
}

/** Helper: get all processing task IDs for a status. */
function getProcessingIds(worker: TaskWorker, status: string): number[] {
  const set = worker.getProcessingTasks().get(status);
  return set ? [...set] : [];
}

function createDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      port INTEGER NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'copilot_cli_sdk',
      command TEXT DEFAULT NULL,
      options TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec("INSERT INTO agents (id, name, port) VALUES (1, 'mock-agent', 9999)");
  db.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
      status TEXT NOT NULL DEFAULT 'planning',
      state TEXT NOT NULL DEFAULT 'pending',
      failure_reason TEXT DEFAULT NULL,
      completed_at TEXT DEFAULT NULL,
      active_time_ms INTEGER NOT NULL DEFAULT 0,
      active_since TEXT DEFAULT NULL,
      archived_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE task_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'user',
      content TEXT NOT NULL,
      task_state_at_creation TEXT NOT NULL,
      is_complete INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  return db;
}

describe("TaskWorker", () => {
  let service: TaskService;
  let worker: TaskWorker;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new TaskService(createDb());
    worker = new TaskWorker(service, createMockAgentPool());
  });

  afterEach(() => {
    worker.stop();
    jest.useRealTimers();
  });

  describe("start / stop", () => {
    it("starts and stops the worker", () => {
      expect(worker.isRunning()).toBe(false);
      worker.start();
      expect(worker.isRunning()).toBe(true);
      worker.stop();
      expect(worker.isRunning()).toBe(false);
    });

    it("does not create multiple intervals on repeated start calls", () => {
      worker.start();
      worker.start();
      expect(worker.isRunning()).toBe(true);
      worker.stop();
      expect(worker.isRunning()).toBe(false);
    });
  });

  describe("tick", () => {
    it("picks up a pending planning task and sets it to in_progress", async () => {
      const task = service.create({ title: "Plan me", agent_id: 1 });
      worker.tick();
      await flushMicrotasks();

      const updated = service.findById(task.id)!;
      expect(updated.state).toBe("in_progress");
      expect(getProcessingId(worker, "planning")).toBe(task.id);
    });

    it("picks up a pending development task and sets it to in_progress", async () => {
      const task = service.create({ title: "Dev me", agent_id: 1 });
      service.update(task.id, { state: "done" });
      service.update(task.id, { status: "development" });
      worker.tick();
      await flushMicrotasks();

      const updated = service.findById(task.id)!;
      expect(updated.state).toBe("in_progress");
      expect(getProcessingId(worker, "development")).toBe(task.id);
    });

    it("does not pick up tasks in the done queue", async () => {
      const task = service.create({ title: "Done task", agent_id: 1 });
      service.update(task.id, { state: "done" });
      service.update(task.id, { status: "development" });
      service.update(task.id, { state: "done" });
      service.update(task.id, { status: "done" });

      worker.tick();
      await flushMicrotasks();
      expect(worker.getProcessingTasks().size).toBe(0);
    });

    it("only picks one task per status at a time (no parallel_planning)", async () => {
      service.create({ title: "Plan 1", agent_id: 1 });
      service.create({ title: "Plan 2", agent_id: 1 });
      worker.tick();
      await flushMicrotasks();

      const ids = getProcessingIds(worker, "planning");
      expect(ids).toHaveLength(1);
      const processing = service.findById(ids[0])!;
      expect(processing.state).toBe("in_progress");

      // Second tick should not pick up another planning task
      worker.tick();
      await flushMicrotasks();
      expect(getProcessingIds(worker, "planning")).toEqual(ids);
    });

    it("can process planning and development tasks concurrently", async () => {
      const planTask = service.create({ title: "Plan", agent_id: 1 });

      const devTask = service.create({ title: "Dev", agent_id: 1 });
      service.update(devTask.id, { state: "done" });
      service.update(devTask.id, { status: "development" });

      worker.tick();
      await flushMicrotasks();

      expect(worker.getProcessingTasks().size).toBe(2);
      expect(getProcessingId(worker, "planning")).toBe(planTask.id);
      expect(getProcessingId(worker, "development")).toBe(devTask.id);
    });

    it("does nothing when there are no pending tasks", async () => {
      worker.tick();
      await flushMicrotasks();
      expect(worker.getProcessingTasks().size).toBe(0);
    });
  });

  describe("processing completion", () => {
    it("sets task to done after agent responds", async () => {
      const task = service.create({ title: "Finish me", agent_id: 1 });
      worker.tick();
      await flushMicrotasks();

      expect(service.findById(task.id)!.state).toBe("in_progress");

      jest.advanceTimersByTime(AGENT_DELAY_MS);
      await flushMicrotasks();

      expect(service.findById(task.id)!.state).toBe("done");
      expect(worker.getProcessingTasks().has("planning")).toBe(false);
    });

    it("frees slot after processing so next task can be picked up", async () => {
      service.create({ title: "First", agent_id: 1 });
      service.create({ title: "Second", agent_id: 1 });

      worker.tick();
      await flushMicrotasks();
      const firstId = getProcessingId(worker, "planning")!;

      jest.advanceTimersByTime(AGENT_DELAY_MS);
      await flushMicrotasks();
      expect(worker.getProcessingTasks().has("planning")).toBe(false);

      worker.tick();
      await flushMicrotasks();
      const secondId = getProcessingId(worker, "planning")!;
      expect(secondId).not.toBe(firstId);
    });
  });

  describe("polling via interval", () => {
    it("automatically picks up tasks on poll intervals", async () => {
      service.create({ title: "Auto pick", agent_id: 1 });
      worker.start();

      jest.advanceTimersByTime(1000);
      await flushMicrotasks();

      expect(worker.getProcessingTasks().has("planning")).toBe(true);
    });
  });

  describe("add_message processing", () => {
    it("picks up an add_message task over a pending task (priority)", async () => {
      // Create a pending task
      service.create({ title: "Pending plan", agent_id: 1 });

      // Create another task that is in add_message state
      const msgTask = service.create({ title: "Message task", agent_id: 1 });
      service.update(msgTask.id, { state: "done" });
      service.addUserMessage(msgTask.id, "Please revise");

      worker.tick();
      await flushMicrotasks();

      const updated = service.findById(msgTask.id)!;
      expect(updated.state).toBe("in_progress");
      expect(getProcessingId(worker, "planning")).toBe(msgTask.id);
    });

    it("sets add_message task to in_progress when picked up", async () => {
      const task = service.create({ title: "Plan me", agent_id: 1 });
      service.update(task.id, { state: "done" });
      service.addUserMessage(task.id, "Feedback here");

      worker.tick();
      await flushMicrotasks();

      const updated = service.findById(task.id)!;
      expect(updated.state).toBe("in_progress");
    });

    it("sets add_message task to done after agent responds", async () => {
      const task = service.create({ title: "Revise me", agent_id: 1 });
      service.update(task.id, { state: "done" });
      service.addUserMessage(task.id, "Some feedback");

      worker.tick();
      await flushMicrotasks();
      expect(service.findById(task.id)!.state).toBe("in_progress");

      jest.advanceTimersByTime(AGENT_DELAY_MS);
      await flushMicrotasks();

      expect(service.findById(task.id)!.state).toBe("done");
      expect(worker.getProcessingTasks().has("planning")).toBe(false);
    });
  });

  describe("startup recovery", () => {
    it("marks stuck in_progress tasks as failed before polling begins", () => {
      // Simulate a task left in_progress from a previous run
      const task = service.create({ title: "Stuck", agent_id: 1 });
      service.update(task.id, { state: "in_progress" });

      const count = service.recoverInProgressTasks();

      expect(count).toBe(1);
      const recovered = service.findById(task.id)!;
      expect(recovered.state).toBe("failed");
      expect(recovered.failure_reason).toBe("Worker restarted while task was in progress");
    });
  });

  describe("parallel planning", () => {
    let parallelService: TaskService;
    let parallelWorker: TaskWorker;

    beforeEach(() => {
      const db = createDb();
      // Insert agent with parallel_planning enabled
      db.exec("INSERT INTO agents (id, name, port, options) VALUES (2, 'parallel-agent', 9998, '{\"parallel_planning\":true}')");
      parallelService = new TaskService(db);
      parallelWorker = new TaskWorker(parallelService, createMockAgentPool({ parallel_planning: true }));
    });

    afterEach(() => {
      parallelWorker.stop();
    });

    it("picks up multiple planning tasks when parallel_planning is enabled", async () => {
      const task1 = parallelService.create({ title: "Plan 1", agent_id: 2 });
      const task2 = parallelService.create({ title: "Plan 2", agent_id: 2 });

      parallelWorker.tick();
      await flushMicrotasks();
      // After first tick, one should be picked up
      expect(getProcessingIds(parallelWorker, "planning").length).toBeGreaterThanOrEqual(1);

      parallelWorker.tick();
      await flushMicrotasks();
      // After second tick, both should be picked up
      const ids = getProcessingIds(parallelWorker, "planning");
      expect(ids).toHaveLength(2);
      expect(ids).toContain(task1.id);
      expect(ids).toContain(task2.id);
    });

    it("does not pick up multiple development tasks even with parallel_planning", async () => {
      const task1 = parallelService.create({ title: "Dev 1", agent_id: 2 });
      parallelService.update(task1.id, { state: "done" });
      parallelService.update(task1.id, { status: "development" });

      const task2 = parallelService.create({ title: "Dev 2", agent_id: 2 });
      parallelService.update(task2.id, { state: "done" });
      parallelService.update(task2.id, { status: "development" });

      parallelWorker.tick();
      await flushMicrotasks();
      parallelWorker.tick();
      await flushMicrotasks();

      expect(getProcessingIds(parallelWorker, "development")).toHaveLength(1);
    });
  });

  describe("error handling", () => {
    it("marks a planning task as failed when the agent throws", async () => {
      const failWorker = new TaskWorker(service, createFailingAgentPool("something went wrong"));
      const task = service.create({ title: "Error task", agent_id: 1 });

      failWorker.tick();
      await flushMicrotasks();
      expect(service.findById(task.id)!.state).toBe("in_progress");

      jest.advanceTimersByTime(AGENT_DELAY_MS);
      await flushMicrotasks();

      const failed = service.findById(task.id)!;
      expect(failed.state).toBe("failed");
      expect(failed.failure_reason).toBe("something went wrong");
      expect(failWorker.getProcessingTasks().has("planning")).toBe(false);
      failWorker.stop();
    });

    it("marks a development task as failed when the agent throws", async () => {
      const failWorker = new TaskWorker(service, createFailingAgentPool("dev error"));
      const task = service.create({ title: "Dev error task", agent_id: 1 });
      service.update(task.id, { state: "done" });
      service.update(task.id, { status: "development" });

      failWorker.tick();
      await flushMicrotasks();

      jest.advanceTimersByTime(AGENT_DELAY_MS);
      await flushMicrotasks();

      const failed = service.findById(task.id)!;
      expect(failed.state).toBe("failed");
      expect(failed.failure_reason).toBe("dev error");
      expect(failWorker.getProcessingTasks().has("development")).toBe(false);
      failWorker.stop();
    });

    it("marks an add_message task as failed when the agent throws", async () => {
      const failWorker = new TaskWorker(service, createFailingAgentPool("sendMessage failed"));
      const task = service.create({ title: "Msg error task", agent_id: 1 });
      service.update(task.id, { state: "done" });
      service.addUserMessage(task.id, "Please revise");

      failWorker.tick();
      await flushMicrotasks();

      jest.advanceTimersByTime(AGENT_DELAY_MS);
      await flushMicrotasks();

      const failed = service.findById(task.id)!;
      expect(failed.state).toBe("failed");
      expect(failed.failure_reason).toBe("sendMessage failed");
      failWorker.stop();
    });

    it("cleans up empty streaming message on failure so retries don't leave duplicates", async () => {
      const failWorker = new TaskWorker(service, createFailingAgentPool("agent crashed"));
      const task = service.create({ title: "Retry task", agent_id: 1 });

      // First attempt — agent fails, should clean up the empty streaming message
      failWorker.tick();
      await flushMicrotasks();
      jest.advanceTimersByTime(AGENT_DELAY_MS);
      await flushMicrotasks();

      expect(service.findById(task.id)!.state).toBe("failed");
      // The empty streaming message should have been deleted
      const messagesAfterFail = service.listMessages(task.id);
      const incomplete = messagesAfterFail.filter((m) => m.is_complete === 0);
      expect(incomplete).toHaveLength(0);

      // Retry — user sends a message to retry
      service.addUserMessage(task.id, "Please try again");

      // Second attempt — also fails, but should NOT leave duplicate incomplete messages
      failWorker.tick();
      await flushMicrotasks();
      jest.advanceTimersByTime(AGENT_DELAY_MS);
      await flushMicrotasks();

      const messagesAfterRetry = service.listMessages(task.id);
      const incompleteAfterRetry = messagesAfterRetry.filter((m) => m.is_complete === 0);
      expect(incompleteAfterRetry).toHaveLength(0);
      failWorker.stop();
    });
  });

  describe("development task completion", () => {
    it("sets development task to done after agent responds", async () => {
      const task = service.create({ title: "Execute me", agent_id: 1 });
      service.update(task.id, { state: "done" });
      service.update(task.id, { status: "development" });

      worker.tick();
      await flushMicrotasks();
      expect(service.findById(task.id)!.state).toBe("in_progress");

      jest.advanceTimersByTime(AGENT_DELAY_MS);
      await flushMicrotasks();

      expect(service.findById(task.id)!.state).toBe("done");
      expect(worker.getProcessingTasks().has("development")).toBe(false);
    });

    it("frees development slot after processing so next dev task can be picked up", async () => {
      const task1 = service.create({ title: "Dev First", agent_id: 1 });
      service.update(task1.id, { state: "done" });
      service.update(task1.id, { status: "development" });

      const task2 = service.create({ title: "Dev Second", agent_id: 1 });
      service.update(task2.id, { state: "done" });
      service.update(task2.id, { status: "development" });

      worker.tick();
      await flushMicrotasks();
      const firstId = getProcessingId(worker, "development")!;

      jest.advanceTimersByTime(AGENT_DELAY_MS);
      await flushMicrotasks();
      expect(worker.getProcessingTasks().has("development")).toBe(false);

      worker.tick();
      await flushMicrotasks();
      const secondId = getProcessingId(worker, "development")!;
      expect(secondId).not.toBe(firstId);
    });
  });});