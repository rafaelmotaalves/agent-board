import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { spawn, type Subprocess, FileSink } from "bun";
import { ClientSideConnection, ndJsonStream, PROTOCOL_VERSION } from "@agentclientprotocol/sdk";
import type { Agent, Client, SessionId } from "@agentclientprotocol/sdk";
import { DeltaCallback, AgentCallbacks, IAgentCaller, OnToolCall, OnToolCallUpdate } from "./agentCaller";
import { SLUG_PLANNING } from "../queues";
import { Task } from "../types";
import logger from "../logger";
import { PLAN_SYSTEM_PROMPT, EXECUTE_SYSTEM_PROMPT } from "./const";

interface SessionState {
    type: "planning" | "execution";
    onDelta?: DeltaCallback;
    onToolCall?: OnToolCall;
    onToolCallUpdate?: OnToolCallUpdate;
}

/**
 * ACP-based agent caller that spawns an ACP agent as a subprocess
 * and communicates over stdio using the Agent Client Protocol.
 */
export class AcpCaller implements IAgentCaller {
    private process: Subprocess | null = null;
    private connection: ClientSideConnection | null = null;
    private initialized = false;
    /** Maps taskId → { planning?: SessionId, execution?: SessionId } */
    private taskSessions: Map<number, { planning?: SessionId; execution?: SessionId }> = new Map();
    /** Maps SessionId → session state (type + active callbacks) */
    private sessions: Map<SessionId, SessionState> = new Map();

    constructor(private readonly command: string, private readonly folder?: string) {}

    private createClient(): (agent: Agent) => Client {
        return () => ({
            requestPermission: async (params) => {
                const sessionType = this.sessions.get(params.sessionId)?.type;
                if (sessionType === "planning") {
                    const rejectOption = params.options.find((o) => o.kind === "reject_once" || o.kind === "reject_always");
                    const optionId = rejectOption?.optionId ?? params.options[0].optionId;
                    return { outcome: { outcome: "selected" as const, optionId } };
                }
                if (sessionType === "execution") {
                    const allowOption = params.options.find((o) => o.kind === "allow_once" || o.kind === "allow_always");
                    const optionId = allowOption?.optionId ?? params.options[0].optionId;
                    return { outcome: { outcome: "selected" as const, optionId } };
                }
                // Deny by default for unknown session types
                const rejectOption = params.options.find((o) => o.kind === "reject_once" || o.kind === "reject_always");
                const optionId = rejectOption?.optionId ?? params.options[0].optionId;
                return { outcome: { outcome: "selected" as const, optionId } };
            },
            readTextFile: async (params) => {
                logger.debug({ path: params.path }, "ACP agent reading file");
                const lines = await readFile(params.path, "utf-8");
                let content = lines;
                if (params.line != null) {
                    const allLines = lines.split("\n");
                    const start = params.line - 1;
                    const end = params.limit != null ? start + params.limit : allLines.length;
                    content = allLines.slice(start, end).join("\n");
                }
                return { content };
            },
            writeTextFile: async (params) => {
                if (this.sessions.get(params.sessionId)?.type !== "execution") {
                    logger.warn({ path: params.path, sessionId: params.sessionId }, "ACP agent attempted to write file outside execution mode — blocked");
                    throw new Error(`File writes are not allowed outside execution mode (attempted: ${params.path})`);
                }
                logger.debug({ path: params.path }, "ACP agent writing file");
                await mkdir(dirname(params.path), { recursive: true });
                await writeFile(params.path, params.content, "utf-8");
                return {};
            },
            sessionUpdate: async (params) => {
                const session = this.sessions.get(params.sessionId);
                const cb = session?.onDelta;
                const toolCallback = session?.onToolCall;
                const toolUpdateCallback = session?.onToolCallUpdate;
                if (params.update.sessionUpdate === "agent_message_chunk") {
                    const content = params.update.content;
                    if (content && "text" in content && typeof content.text === "string") {
                        cb?.(content.text);
                    }
                }
                else if (params.update.sessionUpdate === "tool_call") {
                    const update = params.update as Record<string, unknown>;
                    const title = (update.title as string) ?? "unknown";
                    const rawInput = update.rawInput as Record<string, unknown> | undefined;
                    const inputStr = rawInput ? JSON.stringify(rawInput) : null;
                    toolCallback?.({
                        toolCallId: update.toolCallId as string | undefined,
                        toolName: title,
                        input: inputStr ?? undefined,
                    });
                    logger.info({ sessionId: params.sessionId, toolCall: params.update }, "Tool call");
                }
                else if (params.update.sessionUpdate === "tool_call_update" && params.update.status === "completed") {
                    const update = params.update as Record<string, unknown>;
                    const rawOutput = update.rawOutput as Record<string, unknown> | undefined;
                    const outputStr = rawOutput ? rawOutput.content as string : null;
                    toolUpdateCallback?.({
                        toolCallId: update.toolCallId as string | undefined,
                        output: outputStr ?? undefined,
                        status: "completed",
                    });
                    logger.info({ sessionId: params.sessionId, toolCallUpdate: params.update }, "Tool call update");
                }
            },
        });
    }

    private async ensureConnection(): Promise<ClientSideConnection> {
        if (this.connection && !this.connection.signal.aborted) {
            return this.connection;
        }

        logger.info({ command: this.command }, "Spawning ACP agent subprocess");

        const cmdParts = this.command.split(/\s+/);

        this.process = spawn({
            cwd: this.folder,
            cmd: cmdParts,
            stdin: "pipe",
            stdout: "pipe",
            stderr: "pipe",
        });

        const stdout = this.process.stdout as ReadableStream<Uint8Array>;
        const stdin = this.process.stdin as FileSink;

        if (!stdout || !stdin) {
            throw new Error("Failed to get stdio streams from ACP subprocess");
        }

        const stream = ndJsonStream(
            new WritableStream({
                write(chunk) {
                    stdin.write(chunk);
                },
                close() {
                    stdin.end();
                },
            }),
            stdout,
        );

        this.connection = new ClientSideConnection(this.createClient(), stream);

        if (!this.initialized) {
            await this.connection.initialize({
                protocolVersion: PROTOCOL_VERSION,
                clientInfo: { name: "agent-board", version: "0.1.0" },
                clientCapabilities: {
                    fs: {
                        readTextFile: true,
                        writeTextFile: true,
                    },
                },
            });
            this.initialized = true;
        }

        // Log stderr for debugging
        this.readStderr();

        return this.connection;
    }

    private async readStderr(): Promise<void> {
        if (!this.process?.stderr) return;
        const reader = (this.process.stderr as ReadableStream<Uint8Array>).getReader();
        const decoder = new TextDecoder();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = decoder.decode(value, { stream: true });
                logger.debug({ stderr: text }, "ACP agent stderr");
            }
        } catch {
            // Process may have exited
        }
    }

    private async getOrCreateSession(
        taskId: number,
        type: "planning" | "execution",
    ): Promise<SessionId> {
        const taskEntry = this.taskSessions.get(taskId);
        const existing = taskEntry?.[type];
        if (existing) return existing;

        const conn = await this.ensureConnection();
        logger.info({ taskId, type }, "Creating new ACP session");

        const response = await conn.newSession({
            cwd: this.folder ?? process.cwd(),
            mcpServers: [],
        });

        const sessionId = response.sessionId;
        this.taskSessions.set(taskId, { 
            ...taskEntry, [type]: sessionId }
        );
        this.sessions.set(sessionId, { type });
        return sessionId;
    }

    private async sendPrompt(
        sessionId: SessionId,
        message: string,
        callbacks?: AgentCallbacks,
    ): Promise<string> {
        const conn = await this.ensureConnection();
        let accumulated = "";
        const { onDelta, onToolCall, onToolCallUpdate } = callbacks ?? {};

        const session = this.sessions.get(sessionId);
        if (session) {
            session.onDelta = (delta: string) => {
                accumulated += delta;
                onDelta?.(delta);
            };
            if (onToolCall) session.onToolCall = onToolCall;
            if (onToolCallUpdate) session.onToolCallUpdate = onToolCallUpdate;
        }

        try {
            await conn.prompt({
                sessionId,
                prompt: [{ type: "text", text: message }],
            });

            return accumulated;
        } finally {
            if (session) {
                delete session.onDelta;
                delete session.onToolCall;
                delete session.onToolCallUpdate;
            }

        }
    }

    async planTask(task: Task, callbacks?: AgentCallbacks): Promise<string> {
        logger.info({ taskId: task.id, status: task.status }, "Starting ACP task planning");
        const sessionId = await this.getOrCreateSession(task.id, "planning");

        const prompt = `${PLAN_SYSTEM_PROMPT}

Create a development plan for the following task.
Task: ${task.title}
Description: ${task.description}`;

        return await this.sendPrompt(sessionId, prompt, callbacks);
    }

    async executeTask(task: Task, messages: string[], callbacks?: AgentCallbacks): Promise<string> {
        logger.info({ taskId: task.id, status: task.status }, "Starting ACP task execution");
        const sessionId = await this.getOrCreateSession(task.id, "execution");

        const prompt = `${EXECUTE_SYSTEM_PROMPT}

Implement the following task. Use the plan messages to guide your implementation:

Task: ${task.title}
Description: ${task.description}
Messages: ${messages.join("\n\n")}`;

        return await this.sendPrompt(sessionId, prompt, callbacks);
    }

    async sendMessage(task: Task, message: string, callbacks?: AgentCallbacks): Promise<string> {
        logger.info({ taskId: task.id, message, status: task.status }, "Sending message to ACP agent");
        const isPlanning = task.status === SLUG_PLANNING;
        const sessionId = await this.getOrCreateSession(task.id, isPlanning ? "planning" : "execution");

        return await this.sendPrompt(sessionId, message, callbacks);
    }
}
