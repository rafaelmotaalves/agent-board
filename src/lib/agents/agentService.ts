import { Database } from "bun:sqlite";
import type { Agent, AgentOptions, AgentType } from "../types";
import { isValidAgentType, DEFAULT_AGENT_TYPE } from "../types";
import { getDb } from "../db";

export interface CreateAgentInput {
  name: string;
  port?: number;
  type?: AgentType;
  command?: string;
  folder?: string;
  options?: AgentOptions;
}

export interface UpdateAgentInput {
  name?: string;
  port?: number;
  type?: AgentType;
  command?: string;
  folder?: string | null;
  options?: AgentOptions;
}

export class AgentNotFoundError extends Error {
  constructor(id: number) {
    super(`Agent ${id} not found`);
    this.name = "AgentNotFoundError";
  }
}

export class AgentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentValidationError";
  }
}

export class AgentService {
  private readonly db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDb();
  }

  private parseAgent(row: Record<string, unknown>): Agent {
    const agent = row as unknown as Agent & { options: string };
    return {
      ...agent,
      command: agent.command ?? null,
      folder: agent.folder ?? null,
      options: typeof agent.options === "string" ? JSON.parse(agent.options) : agent.options ?? {},
    };
  }

  list(): Agent[] {
    const rows = this.db
      .prepare("SELECT * FROM agents ORDER BY created_at DESC")
      .all() as Record<string, unknown>[];
    return rows.map((r) => this.parseAgent(r));
  }

  findById(id: number): Agent | undefined {
    const result = this.db
      .prepare("SELECT * FROM agents WHERE id = ?")
      .get(id) as Record<string, unknown> | null;
    return result ? this.parseAgent(result) : undefined;
  }

  create(input: CreateAgentInput): Agent {
    const name = input.name?.trim();
    if (!name) throw new AgentValidationError("Name is required");

    const type = input.type ?? DEFAULT_AGENT_TYPE;
    if (!isValidAgentType(type)) {
      throw new AgentValidationError(`Invalid agent type: ${type}`);
    }

    let port: number | null = null;
    let command: string | null = null;

    if (type === "acp") {
      const cmd = input.command?.trim();
      if (!cmd) throw new AgentValidationError("Command is required for ACP agents");
      command = cmd;
    } else {
      const p = input.port;
      if (!Number.isInteger(p) || !p || p < 1 || p > 65535) {
        throw new AgentValidationError("Port must be an integer between 1 and 65535");
      }
      port = p;
    }

    const folder = input.folder?.trim() || null;
    const options = JSON.stringify(input.options ?? {});

    const result = this.db
      .prepare("INSERT INTO agents (name, port, type, command, folder, options) VALUES (?, ?, ?, ?, ?, ?)")
      .run(name, port, type, command, folder, options);

    return this.findById(result.lastInsertRowid as number)!;
  }

  update(id: number, input: UpdateAgentInput): Agent {
    const existing = this.findById(id);
    if (!existing) throw new AgentNotFoundError(id);

    const name = input.name !== undefined ? input.name.trim() : existing.name;
    if (!name) throw new AgentValidationError("Name is required");

    const type = input.type !== undefined ? input.type : existing.type;
    if (!isValidAgentType(type)) {
      throw new AgentValidationError(`Invalid agent type: ${type}`);
    }

    let port: number;
    let command: string | null;

    if (type === "acp") {
      command = input.command !== undefined ? (input.command?.trim() || null) : existing.command;
      if (!command) throw new AgentValidationError("Command is required for ACP agents");
      port = existing.port;
    } else {
      port = input.port !== undefined ? input.port : existing.port;
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new AgentValidationError("Port must be an integer between 1 and 65535");
      }
      command = existing.command;
    }

    const folder = input.folder !== undefined
      ? (input.folder?.trim() || null)
      : existing.folder;

    const options = input.options !== undefined
      ? JSON.stringify(input.options)
      : JSON.stringify(existing.options);

    this.db
      .prepare("UPDATE agents SET name = ?, port = ?, type = ?, command = ?, folder = ?, options = ? WHERE id = ?")
      .run(name, port, type, command, folder, options, id);

    return this.findById(id)!;
  }

  delete(id: number): void {
    const existing = this.findById(id);
    if (!existing) throw new AgentNotFoundError(id);

    const { count: taskCount } = this.db
      .prepare("SELECT COUNT(*) as count FROM tasks WHERE agent_id = ?")
      .get(id) as { count: number };
    if (taskCount > 0) {
      throw new AgentValidationError(
        `Cannot delete agent "${existing.name}" because it has ${taskCount} assigned task(s)`
      );
    }

    this.db.prepare("DELETE FROM agents WHERE id = ?").run(id);
  }
}
