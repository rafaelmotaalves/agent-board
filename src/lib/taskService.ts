import { Database } from "bun:sqlite";
import { Task, TaskState, isValidState, TaskMessage } from "@/lib/types";
import { isValidQueue, SLUG_DONE } from "@/lib/queues";
import { getDb } from "./db";

export interface CreateTaskInput {
  title: string;
  description?: string;
  /** Agent to assign at creation time */
  agent_id?: number | null;
  /** Queue column to start in (default: 'planning'). Cannot be 'done'. */
  status?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  /** Queue column (planning | development | done) */
  status?: string;
  /** Per-queue state (pending | in_progress | done) */
  state?: string;
  /** Error message when task fails */
  failure_reason?: string | null;
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
        .prepare("SELECT * FROM tasks WHERE status = ? ORDER BY created_at ASC")
        .all(status) as Task[];
    }
    return this.db
      .prepare("SELECT * FROM tasks ORDER BY created_at ASC")
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

  /** Returns the oldest add_message task for the given queue status, or undefined if none. */
  findNextAddMessage(status: string): Task | undefined {
    if (!isValidQueue(status)) throw new ValidationError("Invalid status");
    const result = this.db
      .prepare(
        "SELECT * FROM tasks WHERE status = ? AND state = 'add_message' ORDER BY updated_at ASC LIMIT 1"
      )
      .get(status) as Task | null;
    return result ?? undefined;
  }

  create(input: CreateTaskInput): Task {
    const title = input.title?.trim();
    if (!title) throw new ValidationError("Title is required");

    const status = input.status ?? "planning";
    if (!isValidQueue(status)) throw new ValidationError("Invalid status");
    if (status === SLUG_DONE) throw new ValidationError("Cannot create a task with done status");

    const description = (input.description ?? "").trim();
    const agent_id = input.agent_id ?? null;
    const result = this.db
      .prepare(
        "INSERT INTO tasks (title, description, agent_id, status, state) VALUES (?, ?, ?, ?, 'pending')"
      )
      .run(title, description, agent_id, status);

    const taskId = result.lastInsertRowid as number;

    return this.db
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(taskId) as unknown as Task;
  }

  update(id: number, input: UpdateTaskInput): Task {
    const existing = this.findById(id);
    if (!existing) throw new TaskNotFoundError(id);

    const title = input.title !== undefined ? input.title.trim() : existing.title;
    const description =
      input.description ? input.description.trim() : existing.description;
    const status = input.status ? input.status : existing.status;
    const statusChanged = input.status !== undefined && input.status !== existing.status;

    // Only allow moving to the next queue when the task is done in its current queue
    if (statusChanged && existing.state !== "done") {
      throw new ValidationError("Task must be in done state before moving to the next queue");
    }

    // Moving between queues resets state to pending
    if (statusChanged && input.state !== SLUG_DONE) {
      input.state = "pending";
    }

    const state: TaskState = input.state !== undefined
      ? (input.state as TaskState)
      : existing.state;

    // Resolve failure_reason: explicit null clears it, undefined keeps existing
    const failure_reason = input.failure_reason !== undefined
      ? input.failure_reason
      : existing.failure_reason;

    // Set completed_at when task moves to the "done" queue
    const completed_at = status === SLUG_DONE && existing.status !== SLUG_DONE
      ? new Date().toISOString()
      : (status !== SLUG_DONE ? null : existing.completed_at);

    if (!title) throw new ValidationError("Title is required");
    if (!isValidQueue(status)) throw new ValidationError("Invalid status");
    if (!isValidState(state)) throw new ValidationError("Invalid state");

    this.db
      .prepare(
        "UPDATE tasks SET title = ?, description = ?, status = ?, state = ?, failure_reason = ?, completed_at = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .run(title, description, status, state, failure_reason, completed_at, id);

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

  // ── Messages ────────────────────────────────────────────────────────────────

  /**
   * Adds a user message to a task. Only allowed when the task is in 'done' or 'failed' state.
   * Transitions the task state to 'add_message' so the worker picks it up.
   */
  addUserMessage(taskId: number, content: string): TaskMessage {
    const task = this.findById(taskId);
    if (!task) throw new TaskNotFoundError(taskId);
    if (task.state !== "done" && task.state !== "failed") {
      throw new ValidationError("Messages can only be added when the task is in 'done' or 'failed' state");
    }

    const trimmed = content?.trim();
    if (!trimmed) throw new ValidationError("Message content is required");

    const result = this.db
      .prepare(
        "INSERT INTO task_messages (task_id, role, content, task_state_at_creation) VALUES (?, 'user', ?, ?)"
      )
      .run(taskId, trimmed, task.status);

    // Transition to add_message so the worker picks this up; clear failure_reason
    this.db
      .prepare("UPDATE tasks SET state = 'add_message', failure_reason = NULL, updated_at = datetime('now') WHERE id = ?")
      .run(taskId);

    return this.db
      .prepare("SELECT * FROM task_messages WHERE id = ?")
      .get(result.lastInsertRowid) as unknown as TaskMessage;
  }

  /**
   * Adds an agent response message. No state restrictions — called by the worker.
   * @param taskStatus The queue/phase slug (e.g. 'planning', 'development') at the time the message is added.
   */
  addAgentMessage(taskId: number, content: string, taskStatus: string): TaskMessage {
    const task = this.findById(taskId);
    if (!task) throw new TaskNotFoundError(taskId);

    const trimmed = content?.trim();
    if (!trimmed) throw new ValidationError("Message content is required");

    const result = this.db
      .prepare(
        "INSERT INTO task_messages (task_id, role, content, task_state_at_creation) VALUES (?, 'agent', ?, ?)"
      )
      .run(taskId, trimmed, taskStatus);

    return this.db
      .prepare("SELECT * FROM task_messages WHERE id = ?")
      .get(result.lastInsertRowid) as unknown as TaskMessage;
  }

  listMessages(taskId: number): TaskMessage[] {
    const task = this.findById(taskId);
    if (!task) throw new TaskNotFoundError(taskId);
    return this.db
      .prepare("SELECT * FROM task_messages WHERE task_id = ? ORDER BY created_at ASC")
      .all(taskId) as TaskMessage[];
  }

  getLastMessage(taskId: number): TaskMessage | undefined {
    const task = this.findById(taskId);
    if (!task) throw new TaskNotFoundError(taskId);
    const result = this.db
      .prepare("SELECT * FROM task_messages WHERE task_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(taskId) as TaskMessage | null;
    return result ?? undefined;
  }
}
