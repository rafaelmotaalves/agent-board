import { Database } from "bun:sqlite";
import type { Agent } from "@/lib/types";
import { getDb } from "./db";

export interface CreateAgentInput {
  name: string;
  port: number;
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

  list(): Agent[] {
    return this.db
      .prepare("SELECT * FROM agents ORDER BY created_at DESC")
      .all() as Agent[];
  }

  findById(id: number): Agent | undefined {
    const result = this.db
      .prepare("SELECT * FROM agents WHERE id = ?")
      .get(id) as Agent | null;
    return result ?? undefined;
  }

  create(input: CreateAgentInput): Agent {
    const name = input.name?.trim();
    if (!name) throw new AgentValidationError("Name is required");

    const port = input.port;
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new AgentValidationError("Port must be an integer between 1 and 65535");
    }

    const result = this.db
      .prepare("INSERT INTO agents (name, port) VALUES (?, ?)")
      .run(name, port);

    return this.db
      .prepare("SELECT * FROM agents WHERE id = ?")
      .get(result.lastInsertRowid) as unknown as Agent;
  }

  delete(id: number): void {
    const existing = this.findById(id);
    if (!existing) throw new AgentNotFoundError(id);
    this.db.prepare("DELETE FROM agents WHERE id = ?").run(id);
  }
}
