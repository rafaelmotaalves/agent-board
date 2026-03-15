import { AgentService } from "./agentService";
import { CopilotCaller } from "./copilotCaller";
import { AcpCaller } from "./acpCaller";
import { IAgentCaller } from "./agentCaller";
import { Agent, AgentOptions } from "../types";

/** Derives a cache key from the agent's connection parameters so callers are invalidated when the command/port changes. */
function computeCacheKey(agent: Agent): string {
    if (agent.type === "acp") {
        return `acp:${agent.command}:${agent.folder}`;
    }
    return `copilot:${agent.port}:${agent.folder}`;
}

export class AgentPool {
    private callers: Map<string, IAgentCaller>;
    private agentIdToKey: Map<number, string>;

    constructor(private readonly agentService: AgentService) {
        this.callers = new Map();
        this.agentIdToKey = new Map();
    }

    async get(agentId: number): Promise<IAgentCaller> {
        const agentInfo = await this.agentService.findById(agentId);
        if (!agentInfo) {
            throw new Error(`Agent "${agentId}" not found in the database`);
        }

        const key = computeCacheKey(agentInfo);
        const previousKey = this.agentIdToKey.get(agentId);

        // If the agent's config changed, remove the stale cached caller
        if (previousKey && previousKey !== key) {
            this.callers.delete(previousKey);
        }

        const existing = this.callers.get(key);
        if (existing) {
            this.agentIdToKey.set(agentId, key);
            return existing;
        }

        const caller: IAgentCaller = createCallerForType(agentInfo);
        this.callers.set(key, caller);
        this.agentIdToKey.set(agentId, key);
        return caller;
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
            return new CopilotCaller(agent.port!, agent.folder);
        case "acp":
            if (!agent.command) throw new Error(`ACP agent "${agent.name}" is missing a command`);
            return new AcpCaller(agent.command, agent.folder);
        default:
            throw new Error(`Unsupported agent type: ${agent.type satisfies never}`);
    }
}

