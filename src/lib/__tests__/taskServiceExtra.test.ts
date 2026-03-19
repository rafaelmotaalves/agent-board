import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { TaskService, ValidationError, TaskNotFoundError } from "@/lib/taskService";

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
  db.exec("INSERT INTO agents (id, name, port) VALUES (1, 'test-agent', 9999)");
  db.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      agent_id INTEGER NOT NULL,
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
  db.exec(`
    CREATE TABLE task_tool_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tool_call_id TEXT,
      tool_name TEXT NOT NULL,
      kind TEXT DEFAULT NULL,
      input TEXT,
      output TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      task_state_at_creation TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT DEFAULT NULL
    )
  `);
  db.exec(`
    CREATE TABLE task_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      token_limit INTEGER NOT NULL DEFAULT 0,
      used_tokens INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(task_id, status)
    )
  `);
  return db;
}

function createTaskInDone(service: TaskService): number {
  const task = service.create({ title: "Archivable", agent_id: 1 });
  service.update(task.id, { state: "done" });
  service.update(task.id, { status: "development" });
  service.update(task.id, { state: "done" });
  service.update(task.id, { status: "done" });
  return task.id;
}

describe("TaskService — archive/unarchive", () => {
  let service: TaskService;

  beforeEach(() => {
    service = new TaskService(createDb());
  });

  describe("archive", () => {
    it("archives a task in done queue", () => {
      const id = createTaskInDone(service);
      const archived = service.archive(id);
      expect(archived.archived_at).not.toBeNull();
    });

    it("throws TaskNotFoundError for missing task", () => {
      expect(() => service.archive(999)).toThrow(TaskNotFoundError);
    });

    it("throws ValidationError when task is not in done queue", () => {
      const task = service.create({ title: "Not done", agent_id: 1 });
      expect(() => service.archive(task.id)).toThrow(ValidationError);
    });

    it("throws ValidationError when task is already archived", () => {
      const id = createTaskInDone(service);
      service.archive(id);
      expect(() => service.archive(id)).toThrow(ValidationError);
    });
  });

  describe("unarchive", () => {
    it("unarchives a previously archived task", () => {
      const id = createTaskInDone(service);
      service.archive(id);
      const unarchived = service.unarchive(id);
      expect(unarchived.archived_at).toBeNull();
    });

    it("throws TaskNotFoundError for missing task", () => {
      expect(() => service.unarchive(999)).toThrow(TaskNotFoundError);
    });

    it("throws ValidationError when task is not archived", () => {
      const id = createTaskInDone(service);
      expect(() => service.unarchive(id)).toThrow(ValidationError);
    });
  });

  describe("archiveAllDone", () => {
    it("archives all tasks in done queue", () => {
      const id1 = createTaskInDone(service);
      const id2 = createTaskInDone(service);
      const count = service.archiveAllDone();
      expect(count).toBe(2);
      expect(service.findById(id1)!.archived_at).not.toBeNull();
      expect(service.findById(id2)!.archived_at).not.toBeNull();
    });

    it("returns 0 when no tasks to archive", () => {
      const count = service.archiveAllDone();
      expect(count).toBe(0);
    });

    it("does not archive already-archived tasks", () => {
      const id = createTaskInDone(service);
      service.archive(id);
      const count = service.archiveAllDone();
      expect(count).toBe(0);
    });
  });

  describe("list with includeArchived", () => {
    it("excludes archived tasks by default", () => {
      const id = createTaskInDone(service);
      service.archive(id);
      const tasks = service.list();
      expect(tasks.length).toBe(0);
    });

    it("includes archived tasks when includeArchived is true", () => {
      const id = createTaskInDone(service);
      service.archive(id);
      const tasks = service.list(undefined, true);
      expect(tasks.length).toBe(1);
    });

    it("includes archived tasks with status filter", () => {
      const id = createTaskInDone(service);
      service.archive(id);
      const tasks = service.list("done", true);
      expect(tasks.length).toBe(1);
    });
  });

  describe("findNextAddMessage", () => {
    it("returns the oldest add_message task for the given status", () => {
      const task = service.create({ title: "Task1", agent_id: 1 });
      // Move to done state, then add a message to trigger add_message state
      service.update(task.id, { state: "done" });
      service.addUserMessage(task.id, "hello");
      const found = service.findNextAddMessage("planning");
      expect(found).toBeDefined();
      expect(found!.id).toBe(task.id);
      expect(found!.state).toBe("add_message");
    });

    it("returns undefined when no add_message tasks exist", () => {
      const result = service.findNextAddMessage("planning");
      expect(result).toBeUndefined();
    });

    it("throws ValidationError for invalid status", () => {
      expect(() => service.findNextAddMessage("invalid")).toThrow(ValidationError);
    });
  });
});

describe("TaskService — tool calls", () => {
  let service: TaskService;

  beforeEach(() => {
    service = new TaskService(createDb());
  });

  describe("createToolCall", () => {
    it("creates a tool call for a task", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const toolCall = service.createToolCall(task.id, "edit_file", '{"path": "test.ts"}', "planning");
      expect(toolCall.id).toBeDefined();
      expect(toolCall.tool_name).toBe("edit_file");
      expect(toolCall.input).toBe('{"path": "test.ts"}');
      expect(toolCall.status).toBe("running");
      expect(toolCall.task_state_at_creation).toBe("planning");
    });

    it("creates a tool call with optional toolCallId and kind", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const toolCall = service.createToolCall(task.id, "read_file", null, "development", "tc_123", "read");
      expect(toolCall.tool_call_id).toBe("tc_123");
      expect(toolCall.kind).toBe("read");
    });

    it("creates a tool call with null input", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const toolCall = service.createToolCall(task.id, "bash", null, "planning");
      expect(toolCall.input).toBeNull();
    });

    it("throws TaskNotFoundError for missing task", () => {
      expect(() => service.createToolCall(999, "tool", null, "planning")).toThrow(TaskNotFoundError);
    });
  });

  describe("updateToolCall", () => {
    it("updates tool call output", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const toolCall = service.createToolCall(task.id, "bash", null, "planning");
      service.updateToolCall(toolCall.id, { output: "success" });
      const calls = service.listToolCalls(task.id);
      expect(calls[0].output).toBe("success");
    });

    it("updates tool call status", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const toolCall = service.createToolCall(task.id, "bash", null, "planning");
      service.updateToolCall(toolCall.id, { status: "completed" });
      const calls = service.listToolCalls(task.id);
      expect(calls[0].status).toBe("completed");
    });

    it("updates tool call completed_at", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const toolCall = service.createToolCall(task.id, "bash", null, "planning");
      const now = new Date().toISOString();
      service.updateToolCall(toolCall.id, { completed_at: now });
      const calls = service.listToolCalls(task.id);
      expect(calls[0].completed_at).toBe(now);
    });

    it("updates tool call kind", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const toolCall = service.createToolCall(task.id, "bash", null, "planning");
      service.updateToolCall(toolCall.id, { kind: "write" });
      const calls = service.listToolCalls(task.id);
      expect(calls[0].kind).toBe("write");
    });

    it("does nothing when no updates provided", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const toolCall = service.createToolCall(task.id, "bash", null, "planning");
      service.updateToolCall(toolCall.id, {});
      const calls = service.listToolCalls(task.id);
      expect(calls[0].status).toBe("running");
    });

    it("updates multiple fields at once", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const toolCall = service.createToolCall(task.id, "bash", null, "planning");
      const now = new Date().toISOString();
      service.updateToolCall(toolCall.id, { output: "done", status: "completed", completed_at: now, kind: "exec" });
      const calls = service.listToolCalls(task.id);
      expect(calls[0].output).toBe("done");
      expect(calls[0].status).toBe("completed");
      expect(calls[0].completed_at).toBe(now);
      expect(calls[0].kind).toBe("exec");
    });
  });

  describe("listToolCalls", () => {
    it("returns tool calls in chronological order", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      service.createToolCall(task.id, "tool_a", null, "planning");
      service.createToolCall(task.id, "tool_b", null, "planning");
      const calls = service.listToolCalls(task.id);
      expect(calls.length).toBe(2);
      expect(calls[0].tool_name).toBe("tool_a");
      expect(calls[1].tool_name).toBe("tool_b");
    });

    it("returns empty array when no tool calls", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const calls = service.listToolCalls(task.id);
      expect(calls.length).toBe(0);
    });

    it("throws TaskNotFoundError for missing task", () => {
      expect(() => service.listToolCalls(999)).toThrow(TaskNotFoundError);
    });
  });
});

describe("TaskService — usage", () => {
  let service: TaskService;

  beforeEach(() => {
    service = new TaskService(createDb());
  });

  describe("upsertUsage", () => {
    it("creates a usage record for a task", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const usage = service.upsertUsage(task.id, "planning", 10000, 5000);
      expect(usage.task_id).toBe(task.id);
      expect(usage.status).toBe("planning");
      expect(usage.token_limit).toBe(10000);
      expect(usage.used_tokens).toBe(5000);
    });

    it("updates existing usage on conflict", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      service.upsertUsage(task.id, "planning", 10000, 5000);
      const updated = service.upsertUsage(task.id, "planning", 10000, 8000);
      expect(updated.used_tokens).toBe(8000);
      // Should still be only one record
      const all = service.listUsage(task.id);
      expect(all.length).toBe(1);
    });

    it("creates separate records for different statuses", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      service.upsertUsage(task.id, "planning", 10000, 3000);
      service.upsertUsage(task.id, "development", 10000, 7000);
      const all = service.listUsage(task.id);
      expect(all.length).toBe(2);
    });
  });

  describe("listUsage", () => {
    it("returns all usage records for a task", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      service.upsertUsage(task.id, "planning", 10000, 3000);
      service.upsertUsage(task.id, "development", 10000, 7000);
      const usage = service.listUsage(task.id);
      expect(usage.length).toBe(2);
      const statuses = usage.map(u => u.status);
      expect(statuses).toContain("planning");
      expect(statuses).toContain("development");
    });

    it("returns empty array when no usage", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const usage = service.listUsage(task.id);
      expect(usage.length).toBe(0);
    });
  });
});
