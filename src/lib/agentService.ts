import { Database } from "bun:sqlite";
import type { Agent, AgentOptions, AgentType } from "@/lib/types";
import { isValidAgentType, DEFAULT_AGENT_TYPE } from "@/lib/types";
import { getDb } from "./db";

export interface CreateAgentInput {
  name: string;
  port: number;
  type?: AgentType;
  options?: AgentOptions;
}

export interface UpdateAgentInput {
  name?: string;
  port?: number;
  type?: AgentType;
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

    const port = input.port;
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new AgentValidationError("Port must be an integer between 1 and 65535");
    }

    const type = input.type ?? DEFAULT_AGENT_TYPE;
    if (!isValidAgentType(type)) {
      throw new AgentValidationError(`Invalid agent type: ${type}`);
    }

    const options = JSON.stringify(input.options ?? {});

    const result = this.db
      .prepare("INSERT INTO agents (name, port, type, options) VALUES (?, ?, ?, ?)")
      .run(name, port, type, options);

    return this.findById(result.lastInsertRowid as number)!;
  }

  update(id: number, input: UpdateAgentInput): Agent {
    const existing = this.findById(id);
    if (!existing) throw new AgentNotFoundError(id);

    const name = input.name !== undefined ? input.name.trim() : existing.name;
    if (!name) throw new AgentValidationError("Name is required");

    const port = input.port !== undefined ? input.port : existing.port;
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new AgentValidationError("Port must be an integer between 1 and 65535");
    }

    const type = input.type !== undefined ? input.type : existing.type;
    if (!isValidAgentType(type)) {
      throw new AgentValidationError(`Invalid agent type: ${type}`);
    }

    const options = input.options !== undefined
      ? JSON.stringify(input.options)
      : JSON.stringify(existing.options);

    this.db
      .prepare("UPDATE agents SET name = ?, port = ?, type = ?, options = ? WHERE id = ?")
      .run(name, port, type, options, id);

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
