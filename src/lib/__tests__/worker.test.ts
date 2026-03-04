import { describe, it, expect, beforeEach, afterEach, jest } from "bun:test";
import { Database } from "bun:sqlite";
import { TaskService } from "@/lib/taskService";
import { TaskWorker } from "@/lib/worker";
import type { AgentPool } from "@/lib/agentPool";
import type { IAgentCaller } from "@/lib/agentCaller";

const AGENT_DELAY_MS = 10000;

/** Fake caller whose async methods resolve only after AGENT_DELAY_MS (fake-timer controlled). */
function createMockCaller(): IAgentCaller {
  return {
    planTask: () => new Promise((res) => setTimeout(() => res("mock plan"), AGENT_DELAY_MS)),
    executeTask: () => new Promise((res) => setTimeout(() => res("mock execution"), AGENT_DELAY_MS)),
    sendMessage: () => new Promise((res) => setTimeout(() => res("mock response"), AGENT_DELAY_MS)),
  };
}

/**
 * Mock AgentPool — get() resolves synchronously (via microtask) with a mock caller.
 * This means processTask suspends at `await agentPool.get()` but resumes quickly,
 * then suspends again at `await caller.planTask()` until the fake timer fires.
 */
function createMockAgentPool(): AgentPool {
  const caller = createMockCaller();
  return { get: () => Promise.resolve(caller) } as unknown as AgentPool;
}

/** Flush the microtask queue enough times for chained promise resolutions to propagate. */
async function flushMicrotasks() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec("INSERT INTO agents (id, name, port) VALUES (1, 'mock-agent', 9999)");
  db.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      agent_id INTEGER DEFAULT NULL REFERENCES agents(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'planning',
      state TEXT NOT NULL DEFAULT 'pending',
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
      expect(worker.getProcessingTasks().get("planning")).toBe(task.id);
    });

    it("picks up a pending development task and sets it to in_progress", async () => {
      const task = service.create({ title: "Dev me", agent_id: 1 });
      service.update(task.id, { state: "done" });
      service.update(task.id, { status: "development" });
      worker.tick();
      await flushMicrotasks();

      const updated = service.findById(task.id)!;
      expect(updated.state).toBe("in_progress");
      expect(worker.getProcessingTasks().get("development")).toBe(task.id);
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

    it("only picks one task per status at a time", async () => {
      service.create({ title: "Plan 1", agent_id: 1 });
      service.create({ title: "Plan 2", agent_id: 1 });
      worker.tick();
      await flushMicrotasks();

      expect(worker.getProcessingTasks().size).toBe(1);
      const processingId = worker.getProcessingTasks().get("planning")!;
      const processing = service.findById(processingId)!;
      expect(processing.state).toBe("in_progress");

      // Second tick should not pick up another planning task
      worker.tick();
      await flushMicrotasks();
      expect(worker.getProcessingTasks().get("planning")).toBe(processingId);
    });

    it("can process planning and development tasks concurrently", async () => {
      const planTask = service.create({ title: "Plan", agent_id: 1 });

      const devTask = service.create({ title: "Dev", agent_id: 1 });
      service.update(devTask.id, { state: "done" });
      service.update(devTask.id, { status: "development" });

      worker.tick();
      await flushMicrotasks();

      expect(worker.getProcessingTasks().size).toBe(2);
      expect(worker.getProcessingTasks().get("planning")).toBe(planTask.id);
      expect(worker.getProcessingTasks().get("development")).toBe(devTask.id);
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
      const firstId = worker.getProcessingTasks().get("planning")!;

      jest.advanceTimersByTime(AGENT_DELAY_MS);
      await flushMicrotasks();
      expect(worker.getProcessingTasks().has("planning")).toBe(false);

      worker.tick();
      await flushMicrotasks();
      const secondId = worker.getProcessingTasks().get("planning")!;
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
      expect(worker.getProcessingTasks().get("planning")).toBe(msgTask.id);
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
});
