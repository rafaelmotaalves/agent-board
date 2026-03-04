import { IAgentCaller } from "./agentCaller";
import { SLUG_PLANNING } from "./queues";
import { Task, TaskMessage } from "./types";
import { approveAll, CopilotClient, CopilotSession } from "@github/copilot-sdk";
import logger from "./logger";

const LOCALHOST = "localhost";
const PLAN_TIMEOUT_MS = 600000; // 10 minutes
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
        });
        this.executionSessions.set(taskId, session);
        return session;
    }

    async planTask(task: Task): Promise<string> {
        logger.info({ taskId: task.id, status: task.status }, "Starting task planning in agent session");
        const session = await this.getPlanningSession(task.id);

        const prompt = `
        Create a development plan for the following task.
        Task: ${task.title}
        Description: ${task.description}
        `;

        const response = await session.sendAndWait({ prompt: prompt }, PLAN_TIMEOUT_MS);
        return response?.data.content ?? "";
    }

    async executeTask(task: Task, messages: string[]): Promise<string> {
        logger.info({ taskId: task.id, status: task.status }, "Starting task execution in agent session");
        const session = await this.getExecutionSession(task.id);

        const prompt = `
        Implement the following task. Use the plan messages to guide your implementation:

        Task: ${task.title}
        Description: ${task.description}
        Messages: ${messages.join("\n\n")}
        `;

        const response = await session.sendAndWait({ prompt: prompt }, PLAN_TIMEOUT_MS);
        return response?.data.content ?? "";
    }

    async sendMessage(task: Task, message: string): Promise<string> {
        logger.info({ taskId: task.id, message, status: task.status }, "Sending message to agent session");
        const session = task.status == SLUG_PLANNING ? 
            await this.getPlanningSession(task.id) : await this.getExecutionSession(task.id);
        const prompt = message;

        const response = await session.sendAndWait({ prompt: prompt }, PLAN_TIMEOUT_MS);
        return response?.data.content ?? "";
    }
}