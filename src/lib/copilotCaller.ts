import { DeltaCallback, IAgentCaller } from "./agentCaller";
import { SLUG_PLANNING } from "./queues";
import { Task } from "./types";
import { approveAll, CopilotClient, CopilotSession } from "@github/copilot-sdk";
import logger from "./logger";

const LOCALHOST = "localhost";
const PLAN_TIMEOUT_MS = 3600000; // 60 minutes
const PLAN_SYSTEM_MESSAGE = `
You are in planning mode. Your task is to create a development plan for the given task.
    * Do not execute any changes, just return a detailed plan in markdown format.
    * Return the whole plan, **do not generate any files or code snippets separately**.
    * Return only the plan, **do not include any additional text**`;

export class CopilotCaller implements IAgentCaller {
    private readonly client: CopilotClient;
    private planningSessions: Map<number, CopilotSession>;
    private executionSessions: Map<number, CopilotSession>;
    
    constructor(port: number) 
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
            onPermissionRequest: approveAll,
            streaming: true,
            systemMessage: {
                content: PLAN_SYSTEM_MESSAGE.trim()
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
            onPermissionRequest: approveAll,
            streaming: true,
        });
        this.executionSessions.set(taskId, session);
        return session;
    }

    async planTask(task: Task, onDelta?: DeltaCallback): Promise<string> {
        logger.info({ taskId: task.id, status: task.status }, "Starting task planning in agent session");
        const session = await this.getPlanningSession(task.id);

        const prompt = `
        Create a development plan for the following task.
        Task: ${task.title}
        Description: ${task.description}
        `;

        const unsubscribe = onDelta
            ? session.on("assistant.message_delta", (event) => onDelta(event.data.deltaContent))
            : null;

        try {
            const response = await session.sendAndWait({ prompt: prompt }, PLAN_TIMEOUT_MS);
            return response?.data.content ?? "";
        } finally {
            unsubscribe?.();
        }
    }

    async executeTask(task: Task, messages: string[], onDelta?: DeltaCallback): Promise<string> {
        logger.info({ taskId: task.id, status: task.status }, "Starting task execution in agent session");
        const session = await this.getExecutionSession(task.id);

        const prompt = `
        Implement the following task. Use the plan messages to guide your implementation:

        Task: ${task.title}
        Description: ${task.description}
        Messages: ${messages.join("\n\n")}

        Update the user with your progress as you work through the implementation, but do not return anything until the task is fully complete.
        `;
        logger.info({ taskId: task.id, status: task.status, prompt }, "Sending execution prompt to agent session");

        const unsubscribe = onDelta
            ? session.on("assistant.message_delta", (event) => onDelta(event.data.deltaContent))
            : null;

        try {
            const response = await session.sendAndWait({ prompt: prompt }, PLAN_TIMEOUT_MS);
            return response?.data.content ?? "";
        } finally {
            unsubscribe?.();
        }
    }

    async sendMessage(task: Task, message: string, onDelta?: DeltaCallback): Promise<string> {
        logger.info({ taskId: task.id, message, status: task.status }, "Sending message to agent session");
        const session = task.status == SLUG_PLANNING ? 
            await this.getPlanningSession(task.id) : await this.getExecutionSession(task.id);
        const prompt = message;

        const unsubscribe = onDelta
            ? session.on("assistant.message_delta", (event) => onDelta(event.data.deltaContent))
            : null;

        try {
            const response = await session.sendAndWait({ prompt: prompt }, PLAN_TIMEOUT_MS);
            return response?.data.content ?? "";
        } finally {
            unsubscribe?.();
        }
    }
}