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
  private readonly processing = new Map<string, number>(); // status → taskId
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

  getProcessingTasks(): Map<string, number> {
    return new Map(this.processing);
  }

  /** Exposed for testing — runs one poll cycle synchronously (scheduling only). */
  tick(): void {
    log.debug({ processing: Array.from(this.processing.entries()) }, "Tick");
    for (const status of PROCESSABLE_STATUSES) {
      if (this.processing.has(status)) {
        log.debug({ status }, "Already processing a task for this status, skipping");
        continue;
      }

      // Check for add_message tasks first (higher priority than new pending tasks)
      const addMessageTask = this.service.findNextAddMessage(status);
      if (addMessageTask) {
        this.processAddMessageTask(addMessageTask, status);
        continue;
      }

      const pending = this.service.findNextPending(status);

      if (!pending) {
        log.debug({ status }, "No pending tasks");
        continue;
      }

      this.processTask(pending, status);
    }
  }

  private async processTask(task: Task, status: string): Promise<void> {
    this.processing.set(status, task.id);
    this.service.update(task.id, { state: "in_progress" });
    log.info({ taskId: task.id, status, title: task.title }, "Task picked up — processing started");

    try {
      if (task.agent_id) {
        const caller = await this.agentPool.get(task.agent_id);
        log.info({ taskId: task.id, agentId: task.agent_id, status }, "Calling agent");

        const messages = 
          this.service.listMessages(task.id).map(msg => msg.content);
        const response = status === SLUG_PLANNING
          ? await caller.planTask(task)
          : await caller.executeTask(task, messages);
        
        log.info({ taskId: task.id, agentId: task.agent_id, status }, "Agent responded, saving message");
        this.service.addAgentMessage(task.id, response, status);
      }

      this.service.update(task.id, { state: "done" });
      log.info({ taskId: task.id, status }, "Task completed");
    } catch (err: unknown) {
      this.service.update(task.id, { state: "failed" });
      log.error({ taskId: task.id, status, err }, "Task processing failed");
    } finally {
      this.processing.delete(status);
    }
  }

  private async processAddMessageTask(task: Task, status: string): Promise<void> {
    this.processing.set(status, task.id);
    this.service.update(task.id, { state: "in_progress" });
    log.info({ taskId: task.id, status, title: task.title }, "Task message received — re-processing");

    try {
      const message = this.service.getLastMessage(task.id);

      if (task.agent_id) {
        const caller = await this.agentPool.get(task.agent_id);
        log.info({ taskId: task.id, agentId: task.agent_id, status }, "Calling agent for message revision");

        const response = await caller.sendMessage(task, message?.content ?? "");
        this.service.addAgentMessage(task.id, response, status);
      }
      
      this.service.update(task.id, { state: "done" });
      log.info({ taskId: task.id, status }, "Task message revision completed");
    } catch (err: unknown) {
      this.service.update(task.id, { state: "failed" });
      log.error({ taskId: task.id, status, err }, "Task message revision failed");
    } finally {
      this.processing.delete(status);
    }
  }
}
