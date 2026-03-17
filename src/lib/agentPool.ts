import { AgentService } from "./agentService";
import { CopilotCaller } from "./copilotCaller";
import { IAgentCaller } from "./agentCaller";
import { Agent, AgentOptions, AgentType } from "./types";

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
        const caller: IAgentCaller = createCallerForType(agentInfo);
        this.agents.set(agentId.toString(), caller);
        return caller;
    }

    async get(agentId: number): Promise<IAgentCaller> {
        const existing = this.agents.get(agentId.toString());
        if (existing) return existing;
        return this.loadAgent(agentId);
    }

    /** Returns the agent options for the given agent ID, or undefined if not found. */
    getAgentOptions(agentId: number): AgentOptions | undefined {
        const agent = this.agentService.findById(agentId);
        return agent?.options;
    }
}

/** Factory that returns the appropriate caller based on agent type. Extend this when adding new types. */
function createCallerForType(agent: Agent): IAgentCaller {
    switch (agent.type) {
        case "copilot_cli_sdk":
            return new CopilotCaller(agent.port);
        default:
            throw new Error(`Unsupported agent type: ${agent.type satisfies never}`);
    }
}

