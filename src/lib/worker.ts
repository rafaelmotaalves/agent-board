import { TaskService } from "@/lib/taskService";
import { Task } from "./types";
import { AgentPool } from "./agentPool";
import logger from "./logger";
import { SLUG_DEVELOPMENT, SLUG_PLANNING } from "./queues";

const log = logger.child({ module: "TaskWorker" });

const PROCESSABLE_STATUSES = [SLUG_PLANNING, SLUG_DEVELOPMENT] as const;

export interface WorkerConfig {
  pollIntervalMs: number;
  processingTimeMs: number;
}

const DEFAULT_CONFIG: WorkerConfig = {
  pollIntervalMs: 2000,
  processingTimeMs: 10000,
};

export class TaskWorker {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly processing = new Map<string, number>(); // status → taskId
  private readonly config: WorkerConfig;
  private readonly agentPool: AgentPool | null;

  constructor(
    private readonly service: TaskService,
    agentPoolOrConfig?: AgentPool | Partial<WorkerConfig>,
    config?: Partial<WorkerConfig>,
  ) {
    if (agentPoolOrConfig instanceof AgentPool) {
      this.agentPool = agentPoolOrConfig;
      this.config = { ...DEFAULT_CONFIG, ...config };
    } else {
      this.agentPool = null;
      this.config = { ...DEFAULT_CONFIG, ...agentPoolOrConfig };
    }
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), this.config.pollIntervalMs);
    log.info({ pollIntervalMs: this.config.pollIntervalMs }, "Worker started");
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
      if (this.agentPool && task.agent_id) {
        const caller = await this.agentPool.get(task.agent_id);
        log.info({ taskId: task.id, agentId: task.agent_id, status }, "Calling agent");

        if (status === SLUG_PLANNING) {
          const plan = await caller.planTask(task);
          this.service.update(task.id, { state: "done", plan });
        } else {
          const execution = await caller.executeTask(task);
          this.service.update(task.id, { state: "done", execution });
        }
      } else {
        await new Promise<void>((resolve) => setTimeout(resolve, this.config.processingTimeMs));
        this.service.update(task.id, { state: "done" });
      }

      log.info({ taskId: task.id, status }, "Task completed");
    } catch (err: unknown) {
      this.service.update(task.id, { state: "failed" });
      log.error({ taskId: task.id, status, err }, "Task processing failed");
    } finally {
      this.processing.delete(status);
    }
  }
}
