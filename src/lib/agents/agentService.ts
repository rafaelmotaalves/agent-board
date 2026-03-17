import { Database } from "bun:sqlite";
import type { Agent, AgentOptions, AgentType } from "../types";
import { isValidAgentType, DEFAULT_AGENT_TYPE } from "../types";
import { getDb } from "../db";

export interface CreateAgentInput {
  name: string;
  port?: number;
  type?: AgentType;
  command?: string;
  folder: string;
  options?: AgentOptions;
}

export interface UpdateAgentInput {
  name?: string;
  port?: number;
  type?: AgentType;
  command?: string;
  folder?: string;
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
      folder: agent.folder ?? "",
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

    const folder = input.folder?.trim();
    if (!folder) throw new AgentValidationError("Working directory is required");
    const options = JSON.stringify(input.options ?? {});

    const result = this.db
      .prepare("INSERT INTO agents (name, port, type, command, folder, options) VALUES (?, ?, ?, ?, ?, ?)")
      .run(name, port, type, command, folder, options);

    return this.findById(result.lastInsertRowid as number)!;
  }

  update(id: number, input: UpdateAgentInput): Agent {
    const existing = this.findById(id);
    if (!existing) throw new AgentNotFoundError(id);

    if (input.type !== undefined && !isValidAgentType(input.type)) {
      throw new AgentValidationError(`Invalid agent type: ${input.type}`);
    }

    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (!trimmed) throw new AgentValidationError("Name is required");
      input = { ...input, name: trimmed };
    }

    if (input.port !== undefined) {
      if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) {
        throw new AgentValidationError("Port must be an integer between 1 and 65535");
      }
    }

    const name = input.name ?? existing.name;
    const port = input.port ?? existing.port;
    const type = input.type ?? existing.type;
    const command = input.command !== undefined ? (input.command?.trim() || null) : existing.command;
    const folder = input.folder !== undefined ? (input.folder?.trim() || undefined) : existing.folder;
    if (!folder) throw new AgentValidationError("Working directory is required");
    const options = JSON.stringify(
      input.options !== undefined ? { ...existing.options, ...input.options } : existing.options
    );

    this.db
      .prepare("UPDATE agents SET name = ?, port = ?, type = ?, command = ?, folder = ?, options = ? WHERE id = ?")
      .run(name, port, type, command, folder, options, id);

    return this.findById(id)!;
  }

  delete(id: number): void {
    const existing = this.findById(id);
    if (!existing) throw new AgentNotFoundError(id);

    const { count: activeTaskCount } = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM tasks WHERE agent_id = ? AND status != 'done'"
      )
      .get(id) as { count: number };
    if (activeTaskCount > 0) {
      throw new AgentValidationError(
        `Cannot delete agent "${existing.name}" because it has ${activeTaskCount} non-done task(s)`
      );
    }

    this.db.prepare("DELETE FROM tasks WHERE agent_id = ? AND status = 'done'").run(id);
    this.db.prepare("DELETE FROM agents WHERE id = ?").run(id);
  }
}
