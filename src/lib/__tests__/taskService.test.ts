import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { TaskService, ValidationError, TaskNotFoundError } from "@/lib/taskService";

function createDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
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

describe("TaskService", () => {
  let service: TaskService;

  beforeEach(() => {
    service = new TaskService(createDb());
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a task with title and description", () => {
      const task = service.create({ title: "My task", description: "Some detail" });
      expect(task.id).toBeDefined();
      expect(task.title).toBe("My task");
      expect(task.description).toBe("Some detail");
      expect(task.status).toBe("planning");
      expect(task.state).toBe("pending");
    });

    it("trims title and description", () => {
      const task = service.create({ title: "  Trim me  ", description: "  also  " });
      expect(task.title).toBe("Trim me");
      expect(task.description).toBe("also");
    });

    it("defaults description to empty string", () => {
      const task = service.create({ title: "No desc" });
      expect(task.description).toBe("");
    });

    it("throws ValidationError when title is empty", () => {
      expect(() => service.create({ title: "" })).toThrow(ValidationError);
      expect(() => service.create({ title: "   " })).toThrow(ValidationError);
    });

    it("creates a task with a custom status", () => {
      const task = service.create({ title: "Dev task", status: "development" });
      expect(task.status).toBe("development");
      expect(task.state).toBe("pending");
    });

    it("defaults status to planning when not provided", () => {
      const task = service.create({ title: "Default status" });
      expect(task.status).toBe("planning");
    });

    it("throws ValidationError when status is done", () => {
      expect(() => service.create({ title: "Bad task", status: "done" })).toThrow(ValidationError);
    });

    it("throws ValidationError when status is invalid", () => {
      expect(() => service.create({ title: "Bad task", status: "invalid" })).toThrow(ValidationError);
    });
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe("list", () => {
    beforeEach(() => {
      service.create({ title: "Planning task" });
      service.create({ title: "Planning task 2" });
      const dev = service.create({ title: "Dev task" });
      service.update(dev.id, { state: "done" });
      service.update(dev.id, { status: "development" });
    });

    it("lists all tasks when no status filter", () => {
      expect(service.list()).toHaveLength(3);
    });

    it("filters by status", () => {
      const planning = service.list("planning");
      expect(planning).toHaveLength(2);
      expect(planning.every((t) => t.status === "planning")).toBe(true);
    });

    it("throws ValidationError for invalid status", () => {
      expect(() => service.list("invalid")).toThrow(ValidationError);
    });

    it("returns tasks in ascending creation order (oldest first)", () => {
      const all = service.list();
      expect(all[0].title).toBe("Planning task");
      expect(all[1].title).toBe("Planning task 2");
      expect(all[2].title).toBe("Dev task");
    });

    it("returns filtered tasks in ascending creation order", () => {
      const planning = service.list("planning");
      expect(planning[0].title).toBe("Planning task");
      expect(planning[1].title).toBe("Planning task 2");
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe("findById", () => {
    it("returns the task when found", () => {
      const created = service.create({ title: "Find me" });
      const found = service.findById(created.id);
      expect(found?.title).toBe("Find me");
    });

    it("returns undefined when not found", () => {
      expect(service.findById(999)).toBeUndefined();
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe("update", () => {
    it("updates title and description", () => {
      const task = service.create({ title: "Old title" });
      const updated = service.update(task.id, { title: "New title", description: "New desc" });
      expect(updated.title).toBe("New title");
      expect(updated.description).toBe("New desc");
    });

    it("updates state independently", () => {
      const task = service.create({ title: "Task" });
      const updated = service.update(task.id, { state: "in_progress" });
      expect(updated.state).toBe("in_progress");
      expect(updated.status).toBe("planning");
    });

    it("resets state to pending when status changes", () => {
      const task = service.create({ title: "Task" });
      service.update(task.id, { state: "done" });
      const moved = service.update(task.id, { status: "development" });
      expect(moved.status).toBe("development");
      expect(moved.state).toBe("pending");
    });

    it("throws ValidationError when moving queue while state is not done", () => {
      const task = service.create({ title: "Task" });
      // state is 'pending' by default
      expect(() => service.update(task.id, { status: "development" })).toThrow(ValidationError);
    });

    it("throws ValidationError when moving queue while state is in_progress", () => {
      const task = service.create({ title: "Task" });
      service.update(task.id, { state: "in_progress" });
      expect(() => service.update(task.id, { status: "development" })).toThrow(ValidationError);
    });

    it("does not reset state when status is unchanged", () => {
      const task = service.create({ title: "Task" });
      service.update(task.id, { state: "in_progress" });
      const updated = service.update(task.id, { title: "New title" });
      expect(updated.state).toBe("in_progress");
    });

    it("throws TaskNotFoundError for missing task", () => {
      expect(() => service.update(999, { title: "X" })).toThrow(TaskNotFoundError);
    });

    it("throws ValidationError for empty title", () => {
      const task = service.create({ title: "Task" });
      expect(() => service.update(task.id, { title: "" })).toThrow(ValidationError);
    });

    it("throws ValidationError for invalid status", () => {
      const task = service.create({ title: "Task" });
      expect(() => service.update(task.id, { status: "limbo" })).toThrow(ValidationError);
    });

    it("throws ValidationError for invalid state", () => {
      const task = service.create({ title: "Task" });
      expect(() => service.update(task.id, { state: "flying" })).toThrow(ValidationError);
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes an existing task", () => {
      const task = service.create({ title: "Delete me" });
      service.delete(task.id);
      expect(service.findById(task.id)).toBeUndefined();
    });

    it("throws TaskNotFoundError for missing task", () => {
      expect(() => service.delete(999)).toThrow(TaskNotFoundError);
    });
  });

  // ── reset ────────────────────────────────────────────────────────────────────

  describe("reset", () => {
    it("deletes all tasks", () => {
      service.create({ title: "A" });
      service.create({ title: "B" });
      service.reset();
      expect(service.list()).toHaveLength(0);
    });
  });

  // ── addUserMessage ───────────────────────────────────────────────────────────

  describe("addUserMessage", () => {
    it("adds a user message and transitions task to add_message state", () => {
      const task = service.create({ title: "Task" });
      service.update(task.id, { state: "done" });

      const msg = service.addUserMessage(task.id, "Please revise the plan");
      expect(msg.content).toBe("Please revise the plan");
      expect(msg.role).toBe("user");
      expect(msg.task_state_at_creation).toBe("planning");
      expect(msg.task_id).toBe(task.id);

      const updated = service.findById(task.id)!;
      expect(updated.state).toBe("add_message");
    });

    it("throws ValidationError when task is not in done state", () => {
      const task = service.create({ title: "Task" });
      // state is 'pending'
      expect(() => service.addUserMessage(task.id, "feedback")).toThrow(ValidationError);
    });

    it("throws ValidationError when task is in_progress", () => {
      const task = service.create({ title: "Task" });
      service.update(task.id, { state: "in_progress" });
      expect(() => service.addUserMessage(task.id, "feedback")).toThrow(ValidationError);
    });

    it("throws ValidationError when content is empty", () => {
      const task = service.create({ title: "Task" });
      service.update(task.id, { state: "done" });
      expect(() => service.addUserMessage(task.id, "")).toThrow(ValidationError);
      expect(() => service.addUserMessage(task.id, "   ")).toThrow(ValidationError);
    });

    it("throws TaskNotFoundError for missing task", () => {
      expect(() => service.addUserMessage(999, "hello")).toThrow(TaskNotFoundError);
    });
  });

  // ── addAgentMessage ──────────────────────────────────────────────────────────

  describe("addAgentMessage", () => {
    it("adds an agent message without state restrictions", () => {
      const task = service.create({ title: "Task" });
      service.update(task.id, { state: "in_progress" });

      const msg = service.addAgentMessage(task.id, "Here is the plan", "planning");
      expect(msg.content).toBe("Here is the plan");
      expect(msg.role).toBe("agent");
      expect(msg.task_id).toBe(task.id);
      expect(msg.task_state_at_creation).toBe("planning");
      // task state is unchanged
      expect(service.findById(task.id)!.state).toBe("in_progress");
    });

    it("throws ValidationError when content is empty", () => {
      const task = service.create({ title: "Task" });
      expect(() => service.addAgentMessage(task.id, "", "planning")).toThrow(ValidationError);
    });

    it("throws TaskNotFoundError for missing task", () => {
      expect(() => service.addAgentMessage(999, "hello", "planning")).toThrow(TaskNotFoundError);
    });
  });

  // ── listMessages ─────────────────────────────────────────────────────────────

  describe("listMessages", () => {
    it("returns messages in chronological order", () => {
      const task = service.create({ title: "Task" });
      service.update(task.id, { state: "done" });

      service.addUserMessage(task.id, "First message");
      // put back to done to allow second message
      service.update(task.id, { state: "done" });
      service.addUserMessage(task.id, "Second message");

      const msgs = service.listMessages(task.id);
      expect(msgs).toHaveLength(2);
      expect(msgs[0].content).toBe("First message");
      expect(msgs[1].content).toBe("Second message");
    });

    it("returns empty array when no messages", () => {
      const task = service.create({ title: "Task" });
      expect(service.listMessages(task.id)).toHaveLength(0);
    });

    it("throws TaskNotFoundError for missing task", () => {
      expect(() => service.listMessages(999)).toThrow(TaskNotFoundError);
    });
  });

  // ── recoverInProgressTasks ──────────────────────────────────────────────────

  describe("recoverInProgressTasks", () => {
    it("marks in_progress tasks as failed with a descriptive reason", () => {
      const task = service.create({ title: "Stuck task" });
      service.update(task.id, { state: "in_progress" });

      const count = service.recoverInProgressTasks();

      expect(count).toBe(1);
      const recovered = service.findById(task.id)!;
      expect(recovered.state).toBe("failed");
      expect(recovered.failure_reason).toBe("Worker restarted while task was in progress");
    });

    it("does not affect tasks in other states", () => {
      const pending = service.create({ title: "Pending" });
      const done = service.create({ title: "Done" });
      service.update(done.id, { state: "done" });
      const failed = service.create({ title: "Failed" });
      service.update(failed.id, { state: "failed", failure_reason: "some error" });

      const count = service.recoverInProgressTasks();

      expect(count).toBe(0);
      expect(service.findById(pending.id)!.state).toBe("pending");
      expect(service.findById(done.id)!.state).toBe("done");
      expect(service.findById(failed.id)!.state).toBe("failed");
      expect(service.findById(failed.id)!.failure_reason).toBe("some error");
    });

    it("returns the count of recovered tasks", () => {
      service.create({ title: "Task 1" });
      const t2 = service.create({ title: "Task 2" });
      service.update(t2.id, { state: "in_progress" });
      const t3 = service.create({ title: "Task 3" });
      service.update(t3.id, { state: "in_progress" });

      expect(service.recoverInProgressTasks()).toBe(2);
    });

    it("recovers tasks across different queues", () => {
      const planning = service.create({ title: "Planning task" });
      service.update(planning.id, { state: "in_progress" });

      const dev = service.create({ title: "Dev task" });
      service.update(dev.id, { state: "done" });
      service.update(dev.id, { status: "development" });
      service.update(dev.id, { state: "in_progress" });

      const count = service.recoverInProgressTasks();

      expect(count).toBe(2);
      expect(service.findById(planning.id)!.state).toBe("failed");
      expect(service.findById(dev.id)!.state).toBe("failed");
    });

    it("returns 0 when no tasks are in_progress", () => {
      service.create({ title: "Pending task" });
      expect(service.recoverInProgressTasks()).toBe(0);
    });
  });
});
