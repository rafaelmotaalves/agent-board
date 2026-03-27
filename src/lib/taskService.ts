import type { DatabaseInstance } from "./db";
import { Task, TaskState, isValidState, TaskMessage, ToolCall, TaskUsage } from "./types";
import { isValidQueue, SLUG_DONE } from "./queues";
import { getDb } from "./db";

export interface CreateTaskInput {
  title: string;
  description?: string;
  /** Agent to assign at creation time (required) */
  agent_id: number;
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
  private readonly db: DatabaseInstance;

  constructor(db?: DatabaseInstance) {
    this.db = db ?? getDb();
  }

  list(status?: string, includeArchived = false): Task[] {
    const archivedFilter = includeArchived ? "" : " AND archived_at IS NULL";
    if (status !== undefined) {
      if (!isValidQueue(status)) throw new ValidationError("Invalid status");
      return this.db
        .prepare(`SELECT * FROM tasks WHERE status = ?${archivedFilter} ORDER BY created_at ASC`)
        .all(status) as Task[];
    }
    return this.db
      .prepare(`SELECT * FROM tasks WHERE 1=1${archivedFilter} ORDER BY created_at ASC`)
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

  /** Returns all pending tasks for the given queue status, ordered by created_at ASC. */
  findAllPending(status: string): Task[] {
    if (!isValidQueue(status)) throw new ValidationError("Invalid status");
    return this.db
      .prepare(
        "SELECT * FROM tasks WHERE status = ? AND state = 'pending' ORDER BY created_at ASC"
      )
      .all(status) as Task[];
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

  /** Returns all add_message tasks for the given queue status, ordered by updated_at ASC. */
  findAllAddMessages(status: string): Task[] {
    if (!isValidQueue(status)) throw new ValidationError("Invalid status");
    return this.db
      .prepare(
        "SELECT * FROM tasks WHERE status = ? AND state = 'add_message' ORDER BY updated_at ASC"
      )
      .all(status) as Task[];
  }

  create(input: CreateTaskInput): Task {
    const title = input.title?.trim();
    if (!title) throw new ValidationError("Title is required");

    const status = input.status ?? "planning";
    if (!isValidQueue(status)) throw new ValidationError("Invalid status");
    if (status === SLUG_DONE) throw new ValidationError("Cannot create a task with done status");

    const description = (input.description ?? "").trim();
    const result = this.db
      .prepare(
        "INSERT INTO tasks (title, description, agent_id, status, state) VALUES (?, ?, ?, ?, 'pending')"
      )
      .run(title, description, input.agent_id, status);

    return this.findById(result.lastInsertRowid as number)!;
  }

  update(id: number, input: UpdateTaskInput): Task {
    const existing = this.findById(id);
    if (!existing) throw new TaskNotFoundError(id);

    const title = input.title !== undefined ? input.title.trim() : existing.title;
    const description = input.description !== undefined ? input.description.trim() : existing.description;
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

    // ── Active-time stopwatch logic ──────────────────────────────────────────
    const now = new Date().toISOString();
    let active_time_ms = existing.active_time_ms;
    let active_since: string | null = existing.active_since;

    const enteringActive = state === "in_progress" && existing.state !== "in_progress";
    const leavingActive = state !== "in_progress" && existing.state === "in_progress";

    if (enteringActive) {
      // Start the stopwatch
      active_since = now;
    } else if (leavingActive && existing.active_since) {
      // Stop the stopwatch and accumulate elapsed time
      active_time_ms += Math.max(0, new Date(now).getTime() - new Date(existing.active_since).getTime());
      active_since = null;
    }

    if (!title) throw new ValidationError("Title is required");
    if (!isValidQueue(status)) throw new ValidationError("Invalid status");
    if (!isValidState(state)) throw new ValidationError("Invalid state");

    this.db
      .prepare(
        "UPDATE tasks SET title = ?, description = ?, status = ?, state = ?, failure_reason = ?, completed_at = ?, active_time_ms = ?, active_since = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?"
      )
      .run(title, description, status, state, failure_reason, completed_at, active_time_ms, active_since, id);

    return this.findById(id) as Task;
  }

  delete(id: number): void {
    const existing = this.findById(id);
    if (!existing) throw new TaskNotFoundError(id);
    this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  }

  /**
   * Marks all in_progress tasks as failed on startup so they don't stay stuck
   * after a crash/restart. Accumulates active time before stopping the timer.
   * Returns the number of recovered tasks.
   */
  recoverInProgressTasks(): number {
    const inProgressTasks = this.db
      .prepare("SELECT * FROM tasks WHERE state = 'in_progress'")
      .all() as Task[];

    if (inProgressTasks.length === 0) return 0;

    const now = new Date();
    const stmt = this.db.prepare(
      "UPDATE tasks SET state = 'failed', failure_reason = 'Worker restarted while task was in progress', active_time_ms = ?, active_since = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?"
    );

    this.db.transaction(() => {
      for (const task of inProgressTasks) {
        let accumulated = task.active_time_ms;
        if (task.active_since) {
          accumulated += Math.max(0, now.getTime() - new Date(task.active_since).getTime());
        }
        stmt.run(accumulated, task.id);
      }
    })();

    return inProgressTasks.length;
  }

  archive(id: number): Task {
    const existing = this.findById(id);
    if (!existing) throw new TaskNotFoundError(id);
    if (existing.status !== SLUG_DONE) {
      throw new ValidationError("Only tasks in the done queue can be archived");
    }
    if (existing.archived_at) {
      throw new ValidationError("Task is already archived");
    }
    this.db
      .prepare("UPDATE tasks SET archived_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?")
      .run(id);
    return this.findById(id) as Task;
  }

  unarchive(id: number): Task {
    const existing = this.findById(id);
    if (!existing) throw new TaskNotFoundError(id);
    if (!existing.archived_at) {
      throw new ValidationError("Task is not archived");
    }
    this.db
      .prepare("UPDATE tasks SET archived_at = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?")
      .run(id);
    return this.findById(id) as Task;
  }

  archiveAllDone(): number {
    const result = this.db
      .prepare("UPDATE tasks SET archived_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE status = ? AND archived_at IS NULL")
      .run(SLUG_DONE);
    return result.changes;
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

    return this.db.transaction(() => {
      const result = this.db
        .prepare(
          "INSERT INTO task_messages (task_id, role, content, task_state_at_creation) VALUES (?, 'user', ?, ?)"
        )
        .run(taskId, trimmed, task.status);

      // Transition to add_message so the worker picks this up; clear failure_reason
      this.db
        .prepare("UPDATE tasks SET state = 'add_message', failure_reason = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?")
        .run(taskId);

      return this.db
        .prepare("SELECT * FROM task_messages WHERE id = ?")
        .get(result.lastInsertRowid) as unknown as TaskMessage;
    })();
  }

  /**
   * Creates a streaming agent message placeholder (is_complete=0).
   * The worker will update the content as deltas arrive.
   * Any stale incomplete agent messages for the same task are cleaned up first.
   */
  createStreamingAgentMessage(taskId: number, taskStatus: string): TaskMessage {
    const task = this.findById(taskId);
    if (!task) throw new TaskNotFoundError(taskId);

    return this.db.transaction(() => {
      // Safety net: remove orphaned incomplete messages from a previous failed attempt
      this.deleteIncompleteMessages(taskId);

      const result = this.db
        .prepare(
          "INSERT INTO task_messages (task_id, role, content, task_state_at_creation, is_complete) VALUES (?, 'agent', '', ?, 0)"
        )
        .run(taskId, taskStatus);

      return this.db
        .prepare("SELECT * FROM task_messages WHERE id = ?")
        .get(result.lastInsertRowid) as unknown as TaskMessage;
    })();
  }

  /**
   * Updates the content of a streaming message. Pass is_complete=true to finalize.
   */
  updateMessageContent(messageId: number, content: string, isComplete: boolean): void {
    this.db
      .prepare(
        "UPDATE task_messages SET content = ?, is_complete = ? WHERE id = ?"
      )
      .run(content, isComplete ? 1 : 0, messageId);
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

  /**
   * Deletes a single message by ID.
   */
  deleteMessage(messageId: number): void {
    this.db
      .prepare("DELETE FROM task_messages WHERE id = ?")
      .run(messageId);
  }

  /**
   * Deletes all incomplete (is_complete=0) agent messages for a task.
   * Used to clean up orphaned streaming placeholders after a failed attempt.
   */
  deleteIncompleteMessages(taskId: number): void {
    this.db
      .prepare("DELETE FROM task_messages WHERE task_id = ? AND is_complete = 0")
      .run(taskId);
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

  // ── Tool Calls ──────────────────────────────────────────────────────────────

  createToolCall(
    taskId: number,
    toolName: string,
    input: string | null,
    taskStatus: string,
    toolCallId?: string,
    kind?: string,
  ): ToolCall {
    const task = this.findById(taskId);
    if (!task) throw new TaskNotFoundError(taskId);

    const result = this.db
      .prepare(
        "INSERT INTO task_tool_calls (task_id, tool_call_id, tool_name, kind, input, task_state_at_creation) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(taskId, toolCallId ?? null, toolName, kind ?? null, input, taskStatus);

    return this.db
      .prepare("SELECT * FROM task_tool_calls WHERE id = ?")
      .get(result.lastInsertRowid) as unknown as ToolCall;
  }

  updateToolCall(
    id: number,
    updates: { output?: string; status?: "running" | "completed" | "failed"; completed_at?: string; kind?: string },
  ): void {
    const parts: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.output !== undefined) {
      parts.push("output = ?");
      values.push(updates.output);
    }
    if (updates.status !== undefined) {
      parts.push("status = ?");
      values.push(updates.status);
    }
    if (updates.completed_at !== undefined) {
      parts.push("completed_at = ?");
      values.push(updates.completed_at);
    }
    if (updates.kind !== undefined) {
      parts.push("kind = ?");
      values.push(updates.kind);
    }

    if (parts.length === 0) return;
    values.push(id);
    this.db
      .prepare(`UPDATE task_tool_calls SET ${parts.join(", ")} WHERE id = ?`)
      .run(...values);
  }

  listToolCalls(taskId: number): ToolCall[] {
    const task = this.findById(taskId);
    if (!task) throw new TaskNotFoundError(taskId);
    return this.db
      .prepare("SELECT * FROM task_tool_calls WHERE task_id = ? ORDER BY created_at ASC")
      .all(taskId) as ToolCall[];
  }

  // ── Usage ───────────────────────────────────────────────────────────────────

  upsertUsage(taskId: number, status: string, tokenLimit: number, usedTokens: number): TaskUsage {
    this.db
      .prepare(
        `INSERT INTO task_usage (task_id, status, token_limit, used_tokens)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(task_id, status) DO UPDATE SET
           token_limit = excluded.token_limit,
           used_tokens = excluded.used_tokens,
           updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`
      )
      .run(taskId, status, tokenLimit, usedTokens);

    return this.db
      .prepare("SELECT * FROM task_usage WHERE task_id = ? AND status = ?")
      .get(taskId, status) as TaskUsage;
  }

  listUsage(taskId: number): TaskUsage[] {
    return this.db
      .prepare("SELECT * FROM task_usage WHERE task_id = ? ORDER BY created_at ASC")
      .all(taskId) as TaskUsage[];
  }
}
