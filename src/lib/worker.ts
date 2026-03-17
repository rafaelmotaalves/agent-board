import { TaskService } from "@/lib/taskService";
import { Task } from "@/lib/types";

const PROCESSABLE_STATUSES = ["planning", "development"] as const;

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
  private readonly processing = new Map<string, number>();
  private readonly config: WorkerConfig;

  constructor(
    private readonly service: TaskService,
    config?: Partial<WorkerConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), this.config.pollIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
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
    console.log("Worker tick - checking for tasks to process");
    for (const status of PROCESSABLE_STATUSES) {
      if (this.processing.has(status)) continue;

      const tasks = this.service.list(status) as Task[];
      const pending = tasks.find((t) => t.state === "pending");
      if (!pending) continue;

      this.processTask(pending, status);
    }
  }

  private processTask(task: Task, status: string): void {
    this.processing.set(status, task.id);
    this.service.update(task.id, { state: "in_progress" });

    setTimeout(() => {
      try {
        this.service.update(task.id, { state: "done", "plan": "# Update plan" });
      } finally {
        this.processing.delete(status);
      }
    }, this.config.processingTimeMs);
  }
}
