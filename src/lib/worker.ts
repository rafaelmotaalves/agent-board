import { TaskService } from "@/lib/taskService";
import { Task } from "./types";
import { AgentPool } from "./agents";
import { AgentCallbacks, UsageEvent } from "./agents/agentCaller";
import logger from "./logger";
import { SLUG_DEVELOPMENT, SLUG_PLANNING } from "./queues";
import {
  defaultStreamingStore,
} from "./streamingStore";
import type { StreamingStore } from "./streamingStore";

const log = logger.child({ module: "TaskWorker" });

const PROCESSABLE_STATUSES = [SLUG_PLANNING, SLUG_DEVELOPMENT] as const;
const POOL_INTERVAL_MS = 1000;

export class TaskWorker {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  // status → agentId → set of taskIds
  private readonly processing = new Map<string, Map<number, Set<number>>>();
  private readonly agentPool: AgentPool;
  private readonly streaming: StreamingStore;

  constructor(
    private readonly service: TaskService,
    agentPool: AgentPool,
    streaming: StreamingStore = defaultStreamingStore,
  ) {
    this.agentPool = agentPool;
    this.streaming = streaming;
  }

  start(): void {
    if (this.intervalId) return;
    // Clean up any leftover streaming files from a previous crash
    this.streaming.cleanupAllStreamingFiles();
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
    for (const [status, agentMap] of this.processing) {
      const flat = new Set<number>();
      for (const taskIds of agentMap.values()) {
        for (const id of taskIds) flat.add(id);
      }
      if (flat.size > 0) copy.set(status, flat);
    }
    return copy;
  }

  /** Returns the number of in-progress tasks for a specific agent in a status queue. */
  private getAgentProcessingCount(status: string, agentId: number): number {
    return this.processing.get(status)?.get(agentId)?.size ?? 0;
  }

  /** Returns whether a specific task is already being processed. */
  private isTaskProcessing(status: string, taskId: number): boolean {
    const agentMap = this.processing.get(status);
    if (!agentMap) return false;
    for (const taskIds of agentMap.values()) {
      if (taskIds.has(taskId)) return true;
    }
    return false;
  }

  /** Exposed for testing — runs one poll cycle synchronously (scheduling only). */
  tick(): void {
    log.debug({ processing: Array.from(this.processing.entries()).map(([k, v]) => [k, [...v]]) }, "Tick");
    for (const status of PROCESSABLE_STATUSES) {
      // Process add_message tasks first (higher priority)
      const addMessageTasks = this.service.findAllAddMessages(status);
      for (const task of addMessageTasks) {
        if (this.isTaskProcessing(status, task.id)) continue;

        const agentId = task.agent_id;
        const agentCount = this.getAgentProcessingCount(status, agentId);
        if (agentCount > 0) {
          // Same agent already busy — check parallel options
          const opts = this.agentPool.getAgentOptions(agentId);
          const allowed =
            (status === SLUG_PLANNING && opts?.parallel_planning) ||
            (status === SLUG_DEVELOPMENT && opts?.parallel_development);
          if (!allowed) continue;
        }

        this.processAddMessageTask(task, status);
      }

      // Process pending tasks
      const pendingTasks = this.service.findAllPending(status);
      for (const task of pendingTasks) {
        if (this.isTaskProcessing(status, task.id)) continue;

        const agentId = task.agent_id;
        const agentCount = this.getAgentProcessingCount(status, agentId);
        if (agentCount > 0) {
          // Same agent already busy — check parallel options
          const opts = this.agentPool.getAgentOptions(agentId);
          const allowed =
            (status === SLUG_PLANNING && opts?.parallel_planning) ||
            (status === SLUG_DEVELOPMENT && opts?.parallel_development);
          if (!allowed) continue;
        }

        this.processTask(task, status);
      }
    }
  }

  private addProcessing(status: string, taskId: number, agentId: number): void {
    let agentMap = this.processing.get(status);
    if (!agentMap) {
      agentMap = new Map();
      this.processing.set(status, agentMap);
    }
    let set = agentMap.get(agentId);
    if (!set) {
      set = new Set();
      agentMap.set(agentId, set);
    }
    set.add(taskId);
  }

  private removeProcessing(status: string, taskId: number, agentId: number): void {
    const agentMap = this.processing.get(status);
    if (!agentMap) return;
    const set = agentMap.get(agentId);
    if (set) {
      set.delete(taskId);
      if (set.size === 0) agentMap.delete(agentId);
    }
    if (agentMap.size === 0) this.processing.delete(status);
  }

  private async callWithStreaming(
    task: Task,
    status: string,
    callAgent: (callbacks: AgentCallbacks) => Promise<string>,
  ): Promise<void> {
    const streamingMsg = this.service.createStreamingAgentMessage(task.id, status);
    let accumulated = "";
    this.streaming.initStreamingFile(streamingMsg.id);
    const onDelta = (delta: string) => {
      accumulated += delta;
      this.streaming.appendStreamingChunk(streamingMsg.id, delta);
    };

    // Map tool_call_id from agents → our DB row id so updates can find their row
    const toolCallIdMap = new Map<string, number>();

    const onToolCall = (event: { toolCallId?: string; toolName: string; input?: string; kind?: string }) => {
      const tc = this.service.createToolCall(task.id, event.toolName, event.input ?? null, status, event.toolCallId, event.kind);
      if (event.toolCallId) toolCallIdMap.set(event.toolCallId, tc.id);
    };

    const onToolCallUpdate = (event: { toolCallId?: string; output?: string; status: "completed" | "failed"; kind?: string }) => {
      if (event.toolCallId) {
        const dbId = toolCallIdMap.get(event.toolCallId);
        if (dbId) {
          this.service.updateToolCall(dbId, {
            output: event.output,
            status: event.status,
            completed_at: new Date().toISOString(),
            kind: event.kind,
          });
        }
      }
    };

    const onUsage = (event: UsageEvent) => {
      this.service.upsertUsage(task.id, status, event.tokenLimit, event.usedTokens);
    };

    try {
      const response = await callAgent({ onDelta, onToolCall, onToolCallUpdate, onUsage });
      await this.streaming.finalizeStreamingFile(streamingMsg.id);
      log.info({ taskId: task.id, agentId: task.agent_id, status }, "Agent responded, finalizing message");
      this.service.updateMessageContent(streamingMsg.id, (accumulated || response || "").trim(), true);

      // Mark any remaining running tool calls as completed
      for (const dbId of toolCallIdMap.values()) {
        const toolCalls = this.service.listToolCalls(task.id);
        const tc = toolCalls.find(t => t.id === dbId && t.status === "running");
        if (tc) {
          this.service.updateToolCall(dbId, { status: "completed", completed_at: new Date().toISOString() });
        }
      }
    } catch (err) {
      // Always mark the message as complete so the UI never stays in "writing…" state.
      // If there was partial content, keep it; otherwise set a fallback so the message
      // isn't left with is_complete=0 (which renders the blinking cursor forever).
      const content = accumulated.trim();
      this.service.updateMessageContent(
        streamingMsg.id,
        content || "(The agent encountered an error before producing a response.)",
        true,
      );

      // Mark running tool calls as failed
      for (const dbId of toolCallIdMap.values()) {
        const toolCalls = this.service.listToolCalls(task.id);
        const tc = toolCalls.find(t => t.id === dbId && t.status === "running");
        if (tc) {
          this.service.updateToolCall(dbId, { status: "failed", completed_at: new Date().toISOString() });
        }
      }
      throw err;
    } finally {
      this.streaming.deleteStreamingFile(streamingMsg.id);
    }
  }

  private async processTask(task: Task, status: string): Promise<void> {
    this.addProcessing(status, task.id, task.agent_id);
    this.service.update(task.id, { state: "in_progress" });
    log.info({ taskId: task.id, status, title: task.title }, "Task picked up — processing started");

    try {
      if (task.agent_id) {
        const caller = await this.agentPool.get(task.agent_id);
        log.info({ taskId: task.id, agentId: task.agent_id, status }, "Calling agent");
        const messages = this.service.listMessages(task.id).map(msg => msg.content);
        await this.callWithStreaming(task, status, (callbacks) => {
          const wrappedCallbacks = {
            ...callbacks,
            onDelta: (delta: string) => {
              log.info({ taskId: task.id, agentId: task.agent_id, status, delta }, "Received message delta from agent");
              callbacks.onDelta?.(delta);
            },
          };
          return status === SLUG_PLANNING
            ? caller.planTask(task, wrappedCallbacks)
            : caller.executeTask(task, messages, wrappedCallbacks);
        });
      }

      this.service.update(task.id, { state: "done" });
      log.info({ taskId: task.id, status }, "Task completed");
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      this.service.update(task.id, { state: "failed", failure_reason: reason });
      log.error({ taskId: task.id, status, err }, "Task processing failed");
    } finally {
      this.removeProcessing(status, task.id, task.agent_id);
    }
  }

  private async processAddMessageTask(task: Task, status: string): Promise<void> {
    this.addProcessing(status, task.id, task.agent_id);
    this.service.update(task.id, { state: "in_progress" });
    log.info({ taskId: task.id, status, title: task.title }, "Task message received — re-processing");

    try {
      const message = this.service.getLastMessage(task.id);

      if (task.agent_id) {
        const caller = await this.agentPool.get(task.agent_id);
        log.info({ taskId: task.id, agentId: task.agent_id, status }, "Calling agent for message revision");
        await this.callWithStreaming(task, status, (callbacks) =>
          caller.sendMessage(task, message?.content ?? "", callbacks)
        );
      }

      this.service.update(task.id, { state: "done" });
      log.info({ taskId: task.id, status }, "Task message revision completed");
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      this.service.update(task.id, { state: "failed", failure_reason: reason });
      log.error({ taskId: task.id, status, err }, "Task message revision failed");
    } finally {
      this.removeProcessing(status, task.id, task.agent_id);
    }
  }
}
