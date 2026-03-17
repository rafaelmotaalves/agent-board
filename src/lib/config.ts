import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isValidAgentType } from "./types";
import type { AgentType, AgentOptions } from "./types";

export interface AgentConfig {
  name: string;
  type?: AgentType;
  port?: number;
  command?: string;
  folder: string;
  options?: AgentOptions;
}

export interface BoardConfig {
  agents: AgentConfig[];
}

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigValidationError";
  }
}

export function loadConfig(filePath: string): BoardConfig {
  const resolved = resolve(filePath);
  let raw: string;
  try {
    raw = readFileSync(resolved, "utf-8");
  } catch {
    throw new ConfigValidationError(`Cannot read config file: ${resolved}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigValidationError(`Invalid JSON in config file: ${resolved}`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ConfigValidationError(`Config file must contain a JSON object: ${resolved}`);
  }

  const config = parsed as Record<string, unknown>;

  if (!Array.isArray(config.agents)) {
    throw new ConfigValidationError(`Config must have an "agents" array`);
  }

  const agents: AgentConfig[] = config.agents.map((entry: unknown, i: number) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new ConfigValidationError(`agents[${i}] must be an object`);
    }
    const agent = entry as Record<string, unknown>;

    if (typeof agent.name !== "string" || !agent.name.trim()) {
      throw new ConfigValidationError(`agents[${i}].name is required and must be a non-empty string`);
    }

    if (typeof agent.folder !== "string" || !agent.folder.trim()) {
      throw new ConfigValidationError(`agents[${i}].folder is required and must be a non-empty string`);
    }

    const type = (agent.type as string) ?? "copilot_cli_sdk";
    if (!isValidAgentType(type)) {
      throw new ConfigValidationError(`agents[${i}].type "${type}" is not a valid agent type`);
    }

    if (type === "acp") {
      if (typeof agent.command !== "string" || !agent.command.trim()) {
        throw new ConfigValidationError(`agents[${i}].command is required for ACP agents`);
      }
    } else {
      if (agent.port === undefined || typeof agent.port !== "number" || !Number.isInteger(agent.port) || agent.port < 1 || agent.port > 65535) {
        throw new ConfigValidationError(`agents[${i}].port must be an integer between 1 and 65535 for copilot_cli_sdk agents`);
      }
    }

    if (agent.options !== undefined) {
      if (typeof agent.options !== "object" || agent.options === null || Array.isArray(agent.options)) {
        throw new ConfigValidationError(`agents[${i}].options must be an object`);
      }
    }

    return {
      name: agent.name.trim(),
      type: type as AgentType,
      port: typeof agent.port === "number" ? agent.port : undefined,
      command: typeof agent.command === "string" ? agent.command.trim() || undefined : undefined,
      folder: agent.folder.trim(),
      options: (agent.options as AgentOptions) ?? undefined,
    };
  });

  return { agents };
}
