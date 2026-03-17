import { Database } from "bun:sqlite";
import { Task, TaskState, isValidState } from "@/lib/types";
import { isValidQueue, SLUG_DONE } from "@/lib/queues";
import { getDb } from "./db";

export interface CreateTaskInput {
  title: string;
  description?: string;
  /** Agent to assign at creation time */
  agent_id?: number | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  /** Markdown plan — settable via API only */
  plan?: string | null;
  /** Markdown execution log — settable via API only */
  execution?: string | null;
  /** Queue column (planning | development | done) */
  status?: string;
  /** Per-queue state (pending | in_progress | done) */
  state?: string;
}

export class TaskNotFoundError extends Error {
  constructor(id: number) {
    super(`Task ${id} not found`);
    this.name = "TaskNotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class TaskService {
  private readonly db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDb();
  }

  list(status?: string): Task[] {
    if (status !== undefined) {
      if (!isValidQueue(status)) throw new ValidationError("Invalid status");
      return this.db
        .prepare("SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC")
        .all(status) as Task[];
    }
    return this.db
      .prepare("SELECT * FROM tasks ORDER BY created_at DESC")
      .all() as Task[];
  }

  findById(id: number): Task | undefined {
    const result = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | null;
    return result ?? undefined;
  }

  /** Returns the oldest pending task for the given queue status, or undefined if none. */
  findNextPending(status: string): Task | undefined {
    if (!isValidQueue(status)) throw new ValidationError("Invalid status");
    const result = this.db
      .prepare(
        "SELECT * FROM tasks WHERE status = ? AND state = 'pending' ORDER BY created_at ASC LIMIT 1"
      )
      .get(status) as Task | null;
    return result ?? undefined;
  }

  create(input: CreateTaskInput): Task {
    const title = input.title?.trim();
    if (!title) throw new ValidationError("Title is required");

    const description = (input.description ?? "").trim();
    const agent_id = input.agent_id ?? null;
    const result = this.db
      .prepare(
        "INSERT INTO tasks (title, description, agent_id, status, state) VALUES (?, ?, ?, 'planning', 'pending')"
      )
      .run(title, description, agent_id);

    return this.db
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(result.lastInsertRowid) as unknown as Task;
  }

  update(id: number, input: UpdateTaskInput): Task {
    const existing = this.findById(id);
    if (!existing) throw new TaskNotFoundError(id);

    const title = input.title !== undefined ? input.title.trim() : existing.title;
    const description =
      input.description ? input.description.trim() : existing.description;
    const plan = input.plan !== undefined ? input.plan : existing.plan;
    const execution = input.execution !== undefined ? input.execution : existing.execution;
    const status = input.status ? input.status : existing.status;
    const statusChanged = input.status !== undefined && input.status !== existing.status;

    // Only allow moving to the next queue when the task is done in its current queue
    if (statusChanged && existing.state !== "done") {
      throw new ValidationError("Task must be in done state before moving to the next queue");
    }

    // Moving between queues resets state to pending

    let state: TaskState = input.state !== undefined
      ? (input.state as TaskState)
      : existing.state;

    if (statusChanged && input.state != SLUG_DONE) {
      input.state = "pending";
    }

    if (!title) throw new ValidationError("Title is required");
    if (!isValidQueue(status)) throw new ValidationError("Invalid status");
    if (!isValidState(state)) throw new ValidationError("Invalid state");

    this.db
      .prepare(
        "UPDATE tasks SET title = ?, description = ?, plan = ?, execution = ?, status = ?, state = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .run(title, description, plan, execution, status, state, id);

    return this.findById(id) as Task;
  }

  delete(id: number): void {
    const existing = this.findById(id);
    if (!existing) throw new TaskNotFoundError(id);
    this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  }

  reset(): void {
    this.db.prepare("DELETE FROM tasks").run();
  }
}
