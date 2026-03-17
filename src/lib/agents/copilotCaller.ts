import { AgentCallbacks, IAgentCaller } from "./agentCaller";
import { SLUG_PLANNING } from "../queues";
import { Task } from "../types";
import { approveAll, CopilotClient, CopilotSession, PermissionHandler } from "@github/copilot-sdk";
import logger from "../logger";
import { PLAN_SYSTEM_PROMPT, EXECUTE_SYSTEM_PROMPT } from "./const";

export function createPermissionHandler(
    kindMap: Map<string, string>,
    denyWrites: boolean
): PermissionHandler {
    return (request, invocation) => {
        if (request.toolCallId && request.kind) {
            kindMap.set(request.toolCallId, request.kind);
        }

        if (denyWrites && request.kind === "write") {
            logger.info({ kind: request.kind, toolCallId: request.toolCallId, sessionId: invocation.sessionId }, "Denying write permission request in planning mode");
            return { kind: "denied-by-rules", rules: [{ description: "Write operations are not allowed during planning mode" }] };
        }

        logger.info({ kind: request.kind, toolCallId: request.toolCallId, sessionId: invocation.sessionId }, "Approving tool permission request");
        return approveAll(request, invocation);
    };
}

/** @deprecated Use createPermissionHandler instead. Kept for backward compatibility in tests. */
export const logAndDenyWrites: PermissionHandler = (request, invocation) => {
    if (request.kind === "write") {
        logger.info({ kind: request.kind, toolCallId: request.toolCallId, sessionId: invocation.sessionId }, "Denying write permission request in planning mode");
        return { kind: "denied-by-rules", rules: [{ description: "Write operations are not allowed during planning mode" }] };
    }
    logger.info({ kind: request.kind, toolCallId: request.toolCallId, sessionId: invocation.sessionId }, "Approving tool permission request in planning mode");
    return approveAll(request, invocation);
};

const LOCALHOST = "localhost";
const PLAN_TIMEOUT_MS = 3600000; // 60 minutes
export class CopilotCaller implements IAgentCaller {
    private readonly client: CopilotClient;
    private planningSessions: Map<number, CopilotSession>;
    private executionSessions: Map<number, CopilotSession>;
    private toolCallKindMap: Map<string, string> = new Map();
    
    constructor(port: number, private readonly folder: string) 
    {
        this.client = new CopilotClient({ 
            cliUrl: `${LOCALHOST}:${port}`,
        });
        this.planningSessions = new Map();
        this.executionSessions = new Map();
    }

    private async getPlanningSession(taskId: number): Promise<CopilotSession> {
        if (this.planningSessions.has(taskId)) {
            return this.planningSessions.get(taskId)!;
        }
        logger.info({ taskId }, "Creating new execution session for task planning");
        const session = await this.client.createSession({ 
            onPermissionRequest: createPermissionHandler(this.toolCallKindMap, true),
            streaming: true,
            workingDirectory: this.folder, configDir: this.folder,
            systemMessage: {
                content: PLAN_SYSTEM_PROMPT
            }
        });
        this.planningSessions.set(taskId, session);
        return session;
    }

    private async getExecutionSession(taskId: number): Promise<CopilotSession> {
        if (this.executionSessions.has(taskId)) {
            return this.executionSessions.get(taskId)!;
        }
        logger.info({ taskId }, "Creating new execution session for task execution");
        const session = await this.client.createSession({ 
            onPermissionRequest: createPermissionHandler(this.toolCallKindMap, false),
            streaming: true,
            workingDirectory: this.folder, configDir: this.folder,
            systemMessage: {
                content: EXECUTE_SYSTEM_PROMPT
            }
        });
        this.executionSessions.set(taskId, session);
        return session;
    }

    private setupToolCallListeners(session: CopilotSession, callbacks: AgentCallbacks): (() => void)[] {
        const unsubscribers: (() => void)[] = [];
        const { onToolCall, onToolCallUpdate } = callbacks;

        if (onToolCall) {
            const unsub = session.on("tool.execution_start", (event) => {
                const kind = event.data.toolCallId
                    ? this.toolCallKindMap.get(event.data.toolCallId)
                    : undefined;
                onToolCall({
                    toolCallId: event.data.toolCallId,
                    toolName: event.data.toolName,
                    input: event.data.arguments ? JSON.stringify(event.data.arguments) : undefined,
                    kind: kind!,
                });
            });
            unsubscribers.push(unsub);
        }

        if (onToolCallUpdate) {
            const unsub = session.on("tool.execution_complete", (event) => {
                const kind = event.data.toolCallId
                    ? this.toolCallKindMap.get(event.data.toolCallId)
                    : undefined;
                onToolCallUpdate({
                    toolCallId: event.data.toolCallId,
                    output: event.data.result?.content,
                    status: event.data.success ? "completed" : "failed",
                    kind: kind!,
                });
                // Clean up the kind map entry
                if (event.data.toolCallId) {
                    this.toolCallKindMap.delete(event.data.toolCallId);
                }
            });
            unsubscribers.push(unsub);
        }

        return unsubscribers;
    }

    async planTask(task: Task, callbacks?: AgentCallbacks): Promise<string> {
        const { onDelta } = callbacks ?? {};
        logger.info({ taskId: task.id, status: task.status }, "Starting task planning in agent session");
        const session = await this.getPlanningSession(task.id);

        const prompt = `
        Create a development plan for the following task.
        Task: ${task.title}
        Description: ${task.description}
        `;

        const unsubscribeDelta = onDelta
            ? session.on("assistant.message_delta", (event) => onDelta(event.data.deltaContent))
            : null;
        const toolCallUnsubscribers = callbacks ? this.setupToolCallListeners(session, callbacks) : [];

        session.on("session.usage_info", (event) => {
            logger.info({ sessionId: event.id, usage: event.data }, "Usage info from Copilot session");
        });

        try {
            const response = await session.sendAndWait({ prompt: prompt }, PLAN_TIMEOUT_MS);
            return response?.data.content ?? "";
        } finally {
            unsubscribeDelta?.();
            toolCallUnsubscribers.forEach(unsub => unsub());
        }
    }

    async executeTask(task: Task, messages: string[], callbacks?: AgentCallbacks): Promise<string> {
        const { onDelta } = callbacks ?? {};
        logger.info({ taskId: task.id, status: task.status }, "Starting task execution in agent session");
        const session = await this.getExecutionSession(task.id);

        const prompt = `
        Implement the following task. Use the plan messages to guide your implementation:

        Task: ${task.title}
        Description: ${task.description}
        Messages: ${messages.join("\n\n")}

        `;
        logger.info({ taskId: task.id, status: task.status, prompt }, "Sending execution prompt to agent session");

        const unsubscribeDelta = onDelta
            ? session.on("assistant.message_delta", (event) => onDelta(event.data.deltaContent))
            : null;
        const toolCallUnsubscribers = callbacks ? this.setupToolCallListeners(session, callbacks) : [];

        session.on("session.usage_info", (event) => {
            logger.info({ sessionId: event.id, usage: event.data }, "Usage info from Copilot session");
        });

        try {
            const response = await session.sendAndWait({ prompt: prompt }, PLAN_TIMEOUT_MS);
            return response?.data.content ?? "";
        } finally {
            unsubscribeDelta?.();
            toolCallUnsubscribers.forEach(unsub => unsub());
        }
    }

    async sendMessage(task: Task, message: string, callbacks?: AgentCallbacks): Promise<string> {
        const { onDelta } = callbacks ?? {};
        logger.info({ taskId: task.id, message, status: task.status }, "Sending message to agent session");
        const session = task.status == SLUG_PLANNING ? 
            await this.getPlanningSession(task.id) : await this.getExecutionSession(task.id);
        const prompt = message;

        const unsubscribeDelta = onDelta
            ? session.on("assistant.message_delta", (event) => onDelta(event.data.deltaContent))
            : null;
        const toolCallUnsubscribers = callbacks ? this.setupToolCallListeners(session, callbacks) : [];

        session.on("session.usage_info", (event) => {
            logger.info({ sessionId: event.id, usage: event.data }, "Usage info from Copilot session");
        });

        try {
            const response = await session.sendAndWait({ prompt: prompt }, PLAN_TIMEOUT_MS);
            return response?.data.content ?? "";
        } finally {
            unsubscribeDelta?.();
            toolCallUnsubscribers.forEach(unsub => unsub());
        }
    }
}