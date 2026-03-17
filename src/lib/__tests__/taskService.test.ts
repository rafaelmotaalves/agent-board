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
      active_time_ms INTEGER NOT NULL DEFAULT 0,
      active_since TEXT DEFAULT NULL,
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
      const task = service.create({ title: "My task", description: "Some detail", agent_id: 1 });
      expect(task.id).toBeDefined();
      expect(task.title).toBe("My task");
      expect(task.description).toBe("Some detail");
      expect(task.status).toBe("planning");
      expect(task.state).toBe("pending");
    });

    it("trims title and description", () => {
      const task = service.create({ title: "  Trim me  ", description: "  also  ", agent_id: 1 });
      expect(task.title).toBe("Trim me");
      expect(task.description).toBe("also");
    });

    it("defaults description to empty string", () => {
      const task = service.create({ title: "No desc", agent_id: 1 });
      expect(task.description).toBe("");
    });

    it("throws ValidationError when title is empty", () => {
      expect(() => service.create({ title: "" })).toThrow(ValidationError);
      expect(() => service.create({ title: "   " })).toThrow(ValidationError);
    });

    it("creates a task with a custom status", () => {
      const task = service.create({ title: "Dev task", status: "development", agent_id: 1 });
      expect(task.status).toBe("development");
      expect(task.state).toBe("pending");
    });

    it("defaults status to planning when not provided", () => {
      const task = service.create({ title: "Default status", agent_id: 1 });
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
      service.create({ title: "Planning task", agent_id: 1 });
      service.create({ title: "Planning task 2", agent_id: 1 });
      const dev = service.create({ title: "Dev task", agent_id: 1 });
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
      const created = service.create({ title: "Find me", agent_id: 1 });
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
      const task = service.create({ title: "Old title", agent_id: 1 });
      const updated = service.update(task.id, { title: "New title", description: "New desc" });
      expect(updated.title).toBe("New title");
      expect(updated.description).toBe("New desc");
    });

    it("updates state independently", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const updated = service.update(task.id, { state: "in_progress" });
      expect(updated.state).toBe("in_progress");
      expect(updated.status).toBe("planning");
    });

    it("resets state to pending when status changes", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      service.update(task.id, { state: "done" });
      const moved = service.update(task.id, { status: "development" });
      expect(moved.status).toBe("development");
      expect(moved.state).toBe("pending");
    });

    it("throws ValidationError when moving queue while state is not done", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      // state is 'pending' by default
      expect(() => service.update(task.id, { status: "development" })).toThrow(ValidationError);
    });

    it("throws ValidationError when moving queue while state is in_progress", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      service.update(task.id, { state: "in_progress" });
      expect(() => service.update(task.id, { status: "development" })).toThrow(ValidationError);
    });

    it("does not reset state when status is unchanged", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      service.update(task.id, { state: "in_progress" });
      const updated = service.update(task.id, { title: "New title" });
      expect(updated.state).toBe("in_progress");
    });

    it("throws TaskNotFoundError for missing task", () => {
      expect(() => service.update(999, { title: "X" })).toThrow(TaskNotFoundError);
    });

    it("throws ValidationError for empty title", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      expect(() => service.update(task.id, { title: "" })).toThrow(ValidationError);
    });

    it("throws ValidationError for invalid status", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      expect(() => service.update(task.id, { status: "limbo" })).toThrow(ValidationError);
    });

    it("throws ValidationError for invalid state", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      expect(() => service.update(task.id, { state: "flying" })).toThrow(ValidationError);
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes an existing task", () => {
      const task = service.create({ title: "Delete me", agent_id: 1 });
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
      service.create({ title: "A", agent_id: 1 });
      service.create({ title: "B", agent_id: 1 });
      service.reset();
      expect(service.list()).toHaveLength(0);
    });
  });

  // ── addUserMessage ───────────────────────────────────────────────────────────

  describe("addUserMessage", () => {
    it("adds a user message and transitions task to add_message state", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
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
      const task = service.create({ title: "Task", agent_id: 1 });
      // state is 'pending'
      expect(() => service.addUserMessage(task.id, "feedback")).toThrow(ValidationError);
    });

    it("throws ValidationError when task is in_progress", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      service.update(task.id, { state: "in_progress" });
      expect(() => service.addUserMessage(task.id, "feedback")).toThrow(ValidationError);
    });

    it("throws ValidationError when content is empty", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
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
      const task = service.create({ title: "Task", agent_id: 1 });
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
      const task = service.create({ title: "Task", agent_id: 1 });
      expect(() => service.addAgentMessage(task.id, "", "planning")).toThrow(ValidationError);
    });

    it("throws TaskNotFoundError for missing task", () => {
      expect(() => service.addAgentMessage(999, "hello", "planning")).toThrow(TaskNotFoundError);
    });
  });

  // ── listMessages ─────────────────────────────────────────────────────────────

  describe("listMessages", () => {
    it("returns messages in chronological order", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
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
      const task = service.create({ title: "Task", agent_id: 1 });
      expect(service.listMessages(task.id)).toHaveLength(0);
    });

    it("throws TaskNotFoundError for missing task", () => {
      expect(() => service.listMessages(999)).toThrow(TaskNotFoundError);
    });
  });

  // ── recoverInProgressTasks ──────────────────────────────────────────────────

  describe("recoverInProgressTasks", () => {
    it("marks in_progress tasks as failed with a descriptive reason", () => {
      const task = service.create({ title: "Stuck task", agent_id: 1 });
      service.update(task.id, { state: "in_progress" });

      const count = service.recoverInProgressTasks();

      expect(count).toBe(1);
      const recovered = service.findById(task.id)!;
      expect(recovered.state).toBe("failed");
      expect(recovered.failure_reason).toBe("Worker restarted while task was in progress");
    });

    it("does not affect tasks in other states", () => {
      const pending = service.create({ title: "Pending", agent_id: 1 });
      const done = service.create({ title: "Done", agent_id: 1 });
      service.update(done.id, { state: "done" });
      const failed = service.create({ title: "Failed", agent_id: 1 });
      service.update(failed.id, { state: "failed", failure_reason: "some error" });

      const count = service.recoverInProgressTasks();

      expect(count).toBe(0);
      expect(service.findById(pending.id)!.state).toBe("pending");
      expect(service.findById(done.id)!.state).toBe("done");
      expect(service.findById(failed.id)!.state).toBe("failed");
      expect(service.findById(failed.id)!.failure_reason).toBe("some error");
    });

    it("returns the count of recovered tasks", () => {
      service.create({ title: "Task 1", agent_id: 1 });
      const t2 = service.create({ title: "Task 2", agent_id: 1 });
      service.update(t2.id, { state: "in_progress" });
      const t3 = service.create({ title: "Task 3", agent_id: 1 });
      service.update(t3.id, { state: "in_progress" });

      expect(service.recoverInProgressTasks()).toBe(2);
    });

    it("recovers tasks across different queues", () => {
      const planning = service.create({ title: "Planning task", agent_id: 1 });
      service.update(planning.id, { state: "in_progress" });

      const dev = service.create({ title: "Dev task", agent_id: 1 });
      service.update(dev.id, { state: "done" });
      service.update(dev.id, { status: "development" });
      service.update(dev.id, { state: "in_progress" });

      const count = service.recoverInProgressTasks();

      expect(count).toBe(2);
      expect(service.findById(planning.id)!.state).toBe("failed");
      expect(service.findById(dev.id)!.state).toBe("failed");
    });

    it("returns 0 when no tasks are in_progress", () => {
      service.create({ title: "Pending task", agent_id: 1 });
      expect(service.recoverInProgressTasks()).toBe(0);
    });
  });

  // ── findNextPending ────────────────────────────────────────────────────────

  describe("findNextPending", () => {
    it("returns the oldest pending task for the given status", () => {
      service.create({ title: "First", agent_id: 1 });
      service.create({ title: "Second", agent_id: 1 });

      const next = service.findNextPending("planning");
      expect(next?.title).toBe("First");
    });

    it("returns undefined when no pending tasks exist for the status", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      service.update(task.id, { state: "in_progress" });

      expect(service.findNextPending("planning")).toBeUndefined();
    });

    it("ignores tasks in other states (in_progress, done, failed)", () => {
      const t1 = service.create({ title: "In prog", agent_id: 1 });
      service.update(t1.id, { state: "in_progress" });
      const t2 = service.create({ title: "Done", agent_id: 1 });
      service.update(t2.id, { state: "done" });

      expect(service.findNextPending("planning")).toBeUndefined();
    });

    it("throws ValidationError for invalid status", () => {
      expect(() => service.findNextPending("invalid")).toThrow(ValidationError);
    });
  });

  // ── findNextAddMessage ────────────────────────────────────────────────────

  describe("findNextAddMessage", () => {
    it("returns a task in add_message state for the given status", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      service.update(task.id, { state: "done" });
      service.addUserMessage(task.id, "Please revise");

      const next = service.findNextAddMessage("planning");
      expect(next?.id).toBe(task.id);
    });

    it("returns undefined when no add_message tasks exist", () => {
      service.create({ title: "Pending", agent_id: 1 });
      expect(service.findNextAddMessage("planning")).toBeUndefined();
    });

    it("ignores add_message tasks in other queues", () => {
      const devTask = service.create({ title: "Dev", agent_id: 1 });
      service.update(devTask.id, { state: "done" });
      service.update(devTask.id, { status: "development" });
      service.update(devTask.id, { state: "done" });
      service.addUserMessage(devTask.id, "Revise dev");

      expect(service.findNextAddMessage("planning")).toBeUndefined();
      expect(service.findNextAddMessage("development")?.id).toBe(devTask.id);
    });

    it("throws ValidationError for invalid status", () => {
      expect(() => service.findNextAddMessage("invalid")).toThrow(ValidationError);
    });
  });

  // ── addUserMessage from failed state ───────────────────────────────────────

  describe("addUserMessage - failed state", () => {
    it("allows adding a message when task is in failed state", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      service.update(task.id, { state: "failed", failure_reason: "error occurred" });

      const msg = service.addUserMessage(task.id, "Please retry");
      expect(msg.content).toBe("Please retry");
      expect(msg.role).toBe("user");

      const updated = service.findById(task.id)!;
      expect(updated.state).toBe("add_message");
      expect(updated.failure_reason).toBeNull();
    });
  });

  // ── createStreamingAgentMessage ────────────────────────────────────────────

  describe("createStreamingAgentMessage", () => {
    it("creates a streaming placeholder message with is_complete=0", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const msg = service.createStreamingAgentMessage(task.id, "planning");

      expect(msg.task_id).toBe(task.id);
      expect(msg.role).toBe("agent");
      expect(msg.content).toBe("");
      expect(msg.is_complete).toBe(0);
      expect(msg.task_state_at_creation).toBe("planning");
    });

    it("throws TaskNotFoundError for missing task", () => {
      expect(() => service.createStreamingAgentMessage(999, "planning")).toThrow(TaskNotFoundError);
    });
  });

  // ── updateMessageContent ───────────────────────────────────────────────────

  describe("updateMessageContent", () => {
    it("updates the content of a streaming message", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const msg = service.createStreamingAgentMessage(task.id, "planning");

      service.updateMessageContent(msg.id, "Updated content", false);

      const messages = service.listMessages(task.id);
      const updated = messages.find((m) => m.id === msg.id)!;
      expect(updated.content).toBe("Updated content");
      expect(updated.is_complete).toBe(0);
    });

    it("marks message as complete when is_complete is true", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const msg = service.createStreamingAgentMessage(task.id, "planning");

      service.updateMessageContent(msg.id, "Final content", true);

      const messages = service.listMessages(task.id);
      const updated = messages.find((m) => m.id === msg.id)!;
      expect(updated.content).toBe("Final content");
      expect(updated.is_complete).toBe(1);
    });
  });

  // ── getLastMessage ─────────────────────────────────────────────────────────

  describe("getLastMessage", () => {
    it("returns the most recent message for a task", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      service.update(task.id, { state: "done" });
      service.addUserMessage(task.id, "First");
      service.update(task.id, { state: "done" });
      service.addUserMessage(task.id, "Second");

      // getLastMessage should return one of the two messages
      const msgs = service.listMessages(task.id);
      expect(msgs).toHaveLength(2);
      const last = service.getLastMessage(task.id);
      expect(last).toBeDefined();
      expect(msgs.map((m) => m.id)).toContain(last!.id);
    });

    it("returns undefined when task has no messages", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      expect(service.getLastMessage(task.id)).toBeUndefined();
    });

    it("throws TaskNotFoundError for missing task", () => {
      expect(() => service.getLastMessage(999)).toThrow(TaskNotFoundError);
    });
  });

  // ── completed_at ──────────────────────────────────────────────────────────

  describe("completed_at", () => {
    it("sets completed_at when task moves to done queue", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      service.update(task.id, { state: "done" });
      service.update(task.id, { status: "development" });
      service.update(task.id, { state: "done" });

      const updated = service.update(task.id, { status: "done" });
      expect(updated.completed_at).not.toBeNull();
    });

    it("clears completed_at when task moves out of done queue", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      service.update(task.id, { state: "done" });
      service.update(task.id, { status: "development" });
      service.update(task.id, { state: "done" });
      service.update(task.id, { status: "done" });

      // Task is in done queue with completed_at set
      const doneTask = service.findById(task.id)!;
      expect(doneTask.completed_at).not.toBeNull();
      expect(doneTask.status).toBe("done");

      // Set state to done so we can move it out of the done queue
      service.update(task.id, { state: "done" });
      const updated = service.update(task.id, { status: "development" });
      expect(updated.completed_at).toBeNull();
    });

    it("is null for tasks not yet in done queue", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      expect(task.completed_at).toBeNull();
    });
  });

  // ── active time tracking ──────────────────────────────────────────────────

  describe("active time tracking", () => {
    it("sets active_since when state transitions to in_progress", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      expect(task.active_since).toBeNull();
      expect(task.active_time_ms).toBe(0);

      const updated = service.update(task.id, { state: "in_progress" });
      expect(updated.active_since).not.toBeNull();
      expect(updated.active_time_ms).toBe(0);
    });

    it("accumulates active_time_ms when state transitions from in_progress to done", () => {
      const task = service.create({ title: "Task", agent_id: 1 });

      // Manually set active_since to 5 seconds ago to simulate elapsed time
      const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
      const db = (service as unknown as { db: Database }).db;
      db.prepare("UPDATE tasks SET state = 'in_progress', active_since = ? WHERE id = ?")
        .run(fiveSecondsAgo, task.id);

      const done = service.update(task.id, { state: "done" });
      expect(done.active_since).toBeNull();
      expect(done.active_time_ms).toBeGreaterThanOrEqual(4000);
      expect(done.active_time_ms).toBeLessThan(10000);
    });

    it("accumulates active_time_ms when state transitions from in_progress to failed", () => {
      const task = service.create({ title: "Task", agent_id: 1 });

      const threeSecondsAgo = new Date(Date.now() - 3000).toISOString();
      const db = (service as unknown as { db: Database }).db;
      db.prepare("UPDATE tasks SET state = 'in_progress', active_since = ? WHERE id = ?")
        .run(threeSecondsAgo, task.id);

      const failed = service.update(task.id, { state: "failed", failure_reason: "error" });
      expect(failed.active_since).toBeNull();
      expect(failed.active_time_ms).toBeGreaterThanOrEqual(2000);
    });

    it("accumulates across multiple in_progress cycles", () => {
      const task = service.create({ title: "Task", agent_id: 1 });

      // First cycle: manually simulate 2 seconds of active time
      const twoSecondsAgo = new Date(Date.now() - 2000).toISOString();
      const db = (service as unknown as { db: Database }).db;
      db.prepare("UPDATE tasks SET state = 'in_progress', active_since = ? WHERE id = ?")
        .run(twoSecondsAgo, task.id);
      service.update(task.id, { state: "done" });

      // Second cycle: simulate 3 more seconds
      const task2 = service.findById(task.id)!;
      const firstCycleMs = task2.active_time_ms;
      expect(firstCycleMs).toBeGreaterThanOrEqual(1000);

      const threeSecondsAgo = new Date(Date.now() - 3000).toISOString();
      db.prepare("UPDATE tasks SET state = 'done', active_since = NULL WHERE id = ?").run(task.id);
      // Transition via add_message path
      db.prepare("UPDATE tasks SET state = 'in_progress', active_since = ? WHERE id = ?")
        .run(threeSecondsAgo, task.id);

      const final = service.update(task.id, { state: "done" });
      expect(final.active_time_ms).toBeGreaterThanOrEqual(firstCycleMs + 2000);
      expect(final.active_since).toBeNull();
    });

    it("does not change active_time_ms when state does not leave in_progress", () => {
      const task = service.create({ title: "Task", agent_id: 1 });
      const updated = service.update(task.id, { state: "in_progress" });
      const titleUpdated = service.update(task.id, { title: "New title" });
      // active_since should still be set, active_time_ms unchanged (no accumulation yet)
      expect(titleUpdated.active_since).toBe(updated.active_since);
      expect(titleUpdated.active_time_ms).toBe(0);
    });

    it("recoverInProgressTasks accumulates active time", () => {
      const task = service.create({ title: "Stuck task", agent_id: 1 });

      const twoSecondsAgo = new Date(Date.now() - 2000).toISOString();
      const db = (service as unknown as { db: Database }).db;
      db.prepare("UPDATE tasks SET state = 'in_progress', active_since = ? WHERE id = ?")
        .run(twoSecondsAgo, task.id);

      const count = service.recoverInProgressTasks();
      expect(count).toBe(1);

      const recovered = service.findById(task.id)!;
      expect(recovered.state).toBe("failed");
      expect(recovered.active_since).toBeNull();
      expect(recovered.active_time_ms).toBeGreaterThanOrEqual(1000);
    });

    it("new tasks start with active_time_ms=0 and active_since=null", () => {
      const task = service.create({ title: "Fresh", agent_id: 1 });
      expect(task.active_time_ms).toBe(0);
      expect(task.active_since).toBeNull();
    });
  });
});
