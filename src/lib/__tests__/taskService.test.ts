import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { TaskService, ValidationError, TaskNotFoundError } from "@/lib/taskService";

function createDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      plan TEXT DEFAULT NULL,
      execution TEXT DEFAULT NULL,
      agent_id INTEGER DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'planning',
      state TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
});
