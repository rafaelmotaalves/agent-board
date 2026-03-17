import { AgentService } from "./agentService";
import { CopilotCaller } from "./copilotCaller";
import { IAgentCaller } from "./agentCaller";
import { Agent } from "./types";

export type AgentCaller = (...args: unknown[]) => Promise<unknown>;

export class AgentPool {
    private agents: Map<string, IAgentCaller>;

    constructor(private readonly agentService: AgentService) {
        this.agents = new Map();
    }

    private async loadAgent(agentId: number): Promise<IAgentCaller> {
        
        const agentInfo = await this.agentService.findById(agentId);
        if (!agentInfo) {
            throw new Error(`Agent "${agentId}" not found in the database`);
        }
        const caller: IAgentCaller = createCopilotCaller(agentInfo);
        this.agents.set(agentId.toString(), caller);
        return caller;
    }

    async get(agentId: number): Promise<IAgentCaller> {
        const existing = this.agents.get(agentId.toString());
        if (existing) return existing;
        return this.loadAgent(agentId);
    }
}

function createCopilotCaller(agentInfo: Agent): IAgentCaller {
    return new CopilotCaller(agentInfo.port);
}

