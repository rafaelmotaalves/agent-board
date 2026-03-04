import { IAgentCaller } from "./agentCaller";
import { Task } from "./types";
import { approveAll, CopilotClient } from "@github/copilot-sdk";

const LOCALHOST = "localhost";
const PLAN_TIMEOUT_MS = 600000; // 10 minutes
const PLAN_SYSTEM_MESSAGE = `You are in planning mode. Your task is to create a development plan for the given task. Do not execute any changes, just return a detailed plan in markdown format. Return only the plan, **do not include any additional text**`;

export class CopilotCaller implements IAgentCaller {
    private readonly client: CopilotClient;
    
    constructor(port: number) 
    {
        this.client = new CopilotClient({ 
            cliUrl: `${LOCALHOST}:${port}`,
        });
    }

    async planTask(task: Task): Promise<string> {
        const session = await this.client.createSession({ 
            onPermissionRequest: approveAll,
            systemMessage: {
                content: PLAN_SYSTEM_MESSAGE
            },
        });

        const prompt = `
        Create a development plan for the following task.
        Task: ${task.title}
        Description: ${task.description}
        `;

        const response = await session.sendAndWait({ prompt: prompt }, PLAN_TIMEOUT_MS);
        return response?.data.content ?? "";
    }

    async executeTask(task: Task): Promise<string> {
        const session = await this.client.createSession({ 
            onPermissionRequest: approveAll, 
        });

        const prompt = `
        Implement the following task according to the provided plan.

        Task: ${task.title}
        Description: ${task.description}
        Plan: ${task.plan}
        `;

        const response = await session.sendAndWait({ prompt: prompt }, PLAN_TIMEOUT_MS);
        return response?.data.content ?? "";
    }
}