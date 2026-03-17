import { TaskService } from "@/lib/taskService";
import { Task } from "./types";
import { AgentPool } from "./agentPool";
import logger from "./logger";
import { SLUG_DEVELOPMENT, SLUG_PLANNING } from "./queues";

const log = logger.child({ module: "TaskWorker" });

const PROCESSABLE_STATUSES = [SLUG_PLANNING, SLUG_DEVELOPMENT] as const;
const POOL_INTERVAL_MS = 1000;

export class TaskWorker {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly processing = new Map<string, Set<number>>(); // status → set of taskIds
  private readonly agentPool: AgentPool;

  constructor(
    private readonly service: TaskService,
    agentPool: AgentPool,
  ) {
    this.agentPool = agentPool;
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), POOL_INTERVAL_MS);
    log.info({ pollIntervalMs: POOL_INTERVAL_MS }, "Worker started");
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      log.info("Worker stopped");
    }
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }

  getProcessingTasks(): Map<string, Set<number>> {
    const copy = new Map<string, Set<number>>();
    for (const [k, v] of this.processing) {
      copy.set(k, new Set(v));
    }
    return copy;
  }

  /** Exposed for testing — runs one poll cycle synchronously (scheduling only). */
  tick(): void {
    log.debug({ processing: Array.from(this.processing.entries()).map(([k, v]) => [k, [...v]]) }, "Tick");
    for (const status of PROCESSABLE_STATUSES) {
      const currentSet = this.processing.get(status);
      const currentCount = currentSet?.size ?? 0;

      if (currentCount > 0 && !this.allowsParallelPlanning(status)) {
        log.debug({ status }, "Already processing a task for this status, skipping");
        continue;
      }

      // Check for add_message tasks first (higher priority than new pending tasks)
      const addMessageTask = this.service.findNextAddMessage(status);
      if (addMessageTask && !currentSet?.has(addMessageTask.id)) {
        this.processAddMessageTask(addMessageTask, status);
        continue;
      }

      const pending = this.service.findNextPending(status);

      if (!pending) {
        log.debug({ status }, "No pending tasks");
        continue;
      }

      if (currentSet?.has(pending.id)) continue;

      // Check if the agent allows parallel planning
      if (currentCount > 0 && status === SLUG_PLANNING) {
        const agentOptions = pending.agent_id
          ? this.agentPool.getAgentOptions(pending.agent_id)
          : undefined;
        if (!agentOptions?.parallel_planning) {
          log.debug({ status }, "Agent does not allow parallel planning, skipping");
          continue;
        }
      }

      this.processTask(pending, status);
    }
  }

  /** Returns true if the status queue currently allows picking up additional tasks. */
  private allowsParallelPlanning(status: string): boolean {
    if (status !== SLUG_PLANNING) return false;
    // Check if there's any pending/add_message task whose agent has parallel_planning
    const pending = this.service.findNextPending(status);
    const addMsg = this.service.findNextAddMessage(status);
    const task = addMsg ?? pending;
    if (!task?.agent_id) return false;
    const opts = this.agentPool.getAgentOptions(task.agent_id);
    return !!opts?.parallel_planning;
  }

  private addProcessing(status: string, taskId: number): void {
    let set = this.processing.get(status);
    if (!set) {
      set = new Set();
      this.processing.set(status, set);
    }
    set.add(taskId);
  }

  private removeProcessing(status: string, taskId: number): void {
    const set = this.processing.get(status);
    if (set) {
      set.delete(taskId);
      if (set.size === 0) this.processing.delete(status);
    }
  }

  private async processTask(task: Task, status: string): Promise<void> {
    this.addProcessing(status, task.id);
    this.service.update(task.id, { state: "in_progress" });
    log.info({ taskId: task.id, status, title: task.title }, "Task picked up — processing started");

    try {
      if (task.agent_id) {
        const caller = await this.agentPool.get(task.agent_id);
        log.info({ taskId: task.id, agentId: task.agent_id, status }, "Calling agent");

        const messages = 
          this.service.listMessages(task.id).map(msg => msg.content);

        // Create streaming placeholder so UI updates during generation
        const streamingMsg = this.service.createStreamingAgentMessage(task.id, status);
        let accumulated = "";
        let lastFlush = Date.now();
        const FLUSH_INTERVAL_MS = 300;

        const onDelta = (delta: string) => {
          logger.info({ taskId: task.id, agentId: task.agent_id, status, delta }, "Received message delta from agent");
          accumulated += delta;
          const now = Date.now();
          if (now - lastFlush >= FLUSH_INTERVAL_MS) {
            this.service.updateMessageContent(streamingMsg.id, accumulated, false);
            lastFlush = now;
          }
        };

        const response = status === SLUG_PLANNING
          ? await caller.planTask(task, onDelta)
          : await caller.executeTask(task, messages, onDelta);

        // Finalize: use the full response from sendAndWait (authoritative), fall back to accumulated
        const finalContent = (response || accumulated).trim();
        log.info({ taskId: task.id, agentId: task.agent_id, status }, "Agent responded, finalizing message");
        this.service.updateMessageContent(streamingMsg.id, finalContent, true);
      }

      this.service.update(task.id, { state: "done" });
      log.info({ taskId: task.id, status }, "Task completed");
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      this.service.update(task.id, { state: "failed", failure_reason: reason });
      log.error({ taskId: task.id, status, err }, "Task processing failed");
    } finally {
      this.removeProcessing(status, task.id);
    }
  }

  private async processAddMessageTask(task: Task, status: string): Promise<void> {
    this.addProcessing(status, task.id);
    this.service.update(task.id, { state: "in_progress" });
    log.info({ taskId: task.id, status, title: task.title }, "Task message received — re-processing");

    try {
      const message = this.service.getLastMessage(task.id);

      if (task.agent_id) {
        const caller = await this.agentPool.get(task.agent_id);
        log.info({ taskId: task.id, agentId: task.agent_id, status }, "Calling agent for message revision");

        const streamingMsg = this.service.createStreamingAgentMessage(task.id, status);
        let accumulated = "";
        let lastFlush = Date.now();
        const FLUSH_INTERVAL_MS = 300;

        const onDelta = (delta: string) => {
          accumulated += delta;
          const now = Date.now();
          if (now - lastFlush >= FLUSH_INTERVAL_MS) {
            this.service.updateMessageContent(streamingMsg.id, accumulated, false);
            lastFlush = now;
          }
        };

        const response = await caller.sendMessage(task, message?.content ?? "", onDelta);
        const finalContent = (response || accumulated).trim();
        this.service.updateMessageContent(streamingMsg.id, finalContent, true);
      }
      
      this.service.update(task.id, { state: "done" });
      log.info({ taskId: task.id, status }, "Task message revision completed");
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      this.service.update(task.id, { state: "failed", failure_reason: reason });
      log.error({ taskId: task.id, status, err }, "Task message revision failed");
    } finally {
      this.removeProcessing(status, task.id);
    }
  }
}
