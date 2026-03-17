import { IAgentCaller } from "./agentCaller";
import { SLUG_PLANNING } from "./queues";
import { Task, TaskMessage } from "./types";
import { approveAll, CopilotClient, CopilotSession } from "@github/copilot-sdk";

const LOCALHOST = "localhost";
const PLAN_TIMEOUT_MS = 600000; // 10 minutes
const PLAN_SYSTEM_MESSAGE = `You are in planning mode. Your task is to create a development plan for the given task. Do not execute any changes, just return a detailed plan in markdown format. Return only the plan, **do not include any additional text**`;

export class CopilotCaller implements IAgentCaller {
    private readonly client: CopilotClient;
    private planningSession: CopilotSession | null;
    private executionSession: CopilotSession | null;
    
    constructor(port: number) 
    {
        this.client = new CopilotClient({ 
            cliUrl: `${LOCALHOST}:${port}`,
        });
        this.planningSession = null;
        this.executionSession = null;
    }

    private async getPlanningSession(): Promise<CopilotSession> {
        if (this.planningSession) {
            return this.planningSession;
        }
        this.planningSession = await this.client.createSession({ 
            onPermissionRequest: approveAll,
            systemMessage: {
                content: PLAN_SYSTEM_MESSAGE
            }
        });
        return this.planningSession;
    }

    private async getExecutionSession(): Promise<CopilotSession> {
        if (this.executionSession) {
            return this.executionSession;
        }
        this.executionSession = await this.client.createSession({ 
            onPermissionRequest: approveAll,
        });
        return this.executionSession;
    }

    async planTask(task: Task): Promise<string> {
        const session = await this.getPlanningSession();

        const prompt = `
        Create a development plan for the following task.
        Task: ${task.title}
        Description: ${task.description}
        `;

        const response = await session.sendAndWait({ prompt: prompt }, PLAN_TIMEOUT_MS);
        return response?.data.content ?? "";
    }

    async executeTask(task: Task): Promise<string> {
        const session = await this.getExecutionSession();

        const prompt = `
        Implement the following task according to the provided plan.

        Task: ${task.title}
        Description: ${task.description}
        Plan: ${task.plan}
        `;

        const response = await session.sendAndWait({ prompt: prompt }, PLAN_TIMEOUT_MS);
        return response?.data.content ?? "";
    }

    async sendMessage(task: Task, message: TaskMessage): Promise<string> {
        const session = task.status == SLUG_PLANNING ? 
            await this.getPlanningSession() : await this.getExecutionSession();
        const prompt = message.content;

        const response = await session.sendAndWait({ prompt: prompt }, PLAN_TIMEOUT_MS);
        return response?.data.content ?? "";
    }

    async revisePlan(task: Task, messages: TaskMessage[]): Promise<string> {
        const session = await this.client.createSession({ 
            onPermissionRequest: approveAll,
            systemMessage: {
                content: PLAN_SYSTEM_MESSAGE
            },
        });

        const messagesText = messages
            .map((m, i) => `Message ${i + 1} (added while task was in '${m.task_state_at_creation}' state):\n${m.content}`)
            .join("\n\n");

        const prompt = `
        Revise the development plan for the following task based on the additional messages/feedback provided.

        Task: ${task.title}
        Description: ${task.description}
        Current Plan: ${task.plan ?? "(none)"}

        Additional Messages/Feedback:
        ${messagesText}

        Please produce an updated plan taking the feedback into account.
        `;

        const response = await session.sendAndWait({ prompt: prompt }, PLAN_TIMEOUT_MS);
        return response?.data.content ?? "";
    }

    async reviseExecution(task: Task, messages: TaskMessage[]): Promise<string> {
        const session = await this.client.createSession({ 
            onPermissionRequest: approveAll, 
        });

        const messagesText = messages
            .map((m, i) => `Message ${i + 1} (added while task was in '${m.task_state_at_creation}' state):\n${m.content}`)
            .join("\n\n");

        const prompt = `
        Re-implement the following task based on the additional messages/feedback provided.

        Task: ${task.title}
        Description: ${task.description}
        Plan: ${task.plan ?? "(none)"}
        Previous Execution: ${task.execution ?? "(none)"}

        Additional Messages/Feedback:
        ${messagesText}

        Please produce an updated implementation taking the feedback into account.
        `;

        const response = await session.sendAndWait({ prompt: prompt }, PLAN_TIMEOUT_MS);
        return response?.data.content ?? "";
    }
}