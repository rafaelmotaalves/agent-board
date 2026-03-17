import { describe, it, expect, beforeEach, afterEach, jest } from "bun:test";
import { Database } from "bun:sqlite";
import { TaskService } from "@/lib/taskService";
import { TaskWorker } from "@/lib/worker";

function createDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'planning',
      state TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    worker = new TaskWorker(service, { pollIntervalMs: 100, processingTimeMs: 10000 });
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
    it("picks up a pending planning task and sets it to in_progress", () => {
      const task = service.create({ title: "Plan me" });
      worker.tick();

      const updated = service.findById(task.id)!;
      expect(updated.state).toBe("in_progress");
      expect(worker.getProcessingTasks().get("planning")).toBe(task.id);
    });

    it("picks up a pending development task and sets it to in_progress", () => {
      const task = service.create({ title: "Dev me" });
      service.update(task.id, { state: "done" });
      service.update(task.id, { status: "development" });
      worker.tick();

      const updated = service.findById(task.id)!;
      expect(updated.state).toBe("in_progress");
      expect(worker.getProcessingTasks().get("development")).toBe(task.id);
    });

    it("does not pick up tasks in the done queue", () => {
      const task = service.create({ title: "Done task" });
      service.update(task.id, { state: "done" });
      service.update(task.id, { status: "development" });
      service.update(task.id, { state: "done" });
      service.update(task.id, { status: "done" });

      worker.tick();
      expect(worker.getProcessingTasks().size).toBe(0);
    });

    it("only picks one task per status at a time", () => {
      service.create({ title: "Plan 1" });
      service.create({ title: "Plan 2" });
      worker.tick();

      expect(worker.getProcessingTasks().size).toBe(1);
      const processingId = worker.getProcessingTasks().get("planning")!;
      const processing = service.findById(processingId)!;
      expect(processing.state).toBe("in_progress");

      // Second tick should not pick up another planning task
      worker.tick();
      expect(worker.getProcessingTasks().get("planning")).toBe(processingId);
    });

    it("can process planning and development tasks concurrently", () => {
      const planTask = service.create({ title: "Plan" });

      const devTask = service.create({ title: "Dev" });
      service.update(devTask.id, { state: "done" });
      service.update(devTask.id, { status: "development" });

      worker.tick();

      expect(worker.getProcessingTasks().size).toBe(2);
      expect(worker.getProcessingTasks().get("planning")).toBe(planTask.id);
      expect(worker.getProcessingTasks().get("development")).toBe(devTask.id);
    });

    it("does nothing when there are no pending tasks", () => {
      worker.tick();
      expect(worker.getProcessingTasks().size).toBe(0);
    });
  });

  describe("processing completion", () => {
    it("sets task to done after processingTimeMs", () => {
      const task = service.create({ title: "Finish me" });
      worker.tick();

      expect(service.findById(task.id)!.state).toBe("in_progress");

      jest.advanceTimersByTime(10000);

      expect(service.findById(task.id)!.state).toBe("done");
      expect(worker.getProcessingTasks().has("planning")).toBe(false);
    });

    it("frees slot after processing so next task can be picked up", () => {
      service.create({ title: "First" });
      service.create({ title: "Second" });

      worker.tick();
      const firstId = worker.getProcessingTasks().get("planning")!;

      jest.advanceTimersByTime(10000);
      expect(worker.getProcessingTasks().has("planning")).toBe(false);

      worker.tick();
      const secondId = worker.getProcessingTasks().get("planning")!;
      expect(secondId).not.toBe(firstId);
    });
  });

  describe("polling via interval", () => {
    it("automatically picks up tasks on poll intervals", () => {
      service.create({ title: "Auto pick" });
      worker.start();

      jest.advanceTimersByTime(100);

      expect(worker.getProcessingTasks().has("planning")).toBe(true);
    });
  });
});
