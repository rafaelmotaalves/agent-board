import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { AgentService, AgentValidationError, AgentNotFoundError } from "@/lib/agentService";

function createDb(): Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      port INTEGER NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  return db;
}

describe("AgentService", () => {
  let service: AgentService;

  beforeEach(() => {
    service = new AgentService(createDb());
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates an agent with name and port", () => {
      const agent = service.create({ name: "my-agent", port: 8080 });
      expect(agent.id).toBeDefined();
      expect(agent.name).toBe("my-agent");
      expect(agent.port).toBe(8080);
      expect(agent.created_at).toBeDefined();
    });

    it("trims the name", () => {
      const agent = service.create({ name: "  trim me  ", port: 3000 });
      expect(agent.name).toBe("trim me");
    });

    it("throws AgentValidationError when name is empty", () => {
      expect(() => service.create({ name: "", port: 8080 })).toThrow(AgentValidationError);
      expect(() => service.create({ name: "   ", port: 8080 })).toThrow(AgentValidationError);
    });

    it("throws AgentValidationError when port is out of range", () => {
      expect(() => service.create({ name: "agent", port: 0 })).toThrow(AgentValidationError);
      expect(() => service.create({ name: "agent", port: 65536 })).toThrow(AgentValidationError);
      expect(() => service.create({ name: "agent", port: -1 })).toThrow(AgentValidationError);
    });

    it("throws AgentValidationError when port is not an integer", () => {
      expect(() => service.create({ name: "agent", port: 3.14 })).toThrow(AgentValidationError);
    });

    it("accepts valid boundary ports", () => {
      const a1 = service.create({ name: "agent-min", port: 1 });
      expect(a1.port).toBe(1);
      const a2 = service.create({ name: "agent-max", port: 65535 });
      expect(a2.port).toBe(65535);
    });
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe("list", () => {
    it("returns empty array when no agents", () => {
      expect(service.list()).toHaveLength(0);
    });

    it("lists all created agents", () => {
      service.create({ name: "agent-1", port: 3001 });
      service.create({ name: "agent-2", port: 3002 });
      expect(service.list()).toHaveLength(2);
    });

    it("returns all created agents in the list", () => {
      const a1 = service.create({ name: "first", port: 4001 });
      const a2 = service.create({ name: "second", port: 4002 });
      const list = service.list();
      expect(list).toHaveLength(2);
      expect(list.find((a) => a.id === a1.id)).toBeDefined();
      expect(list.find((a) => a.id === a2.id)).toBeDefined();
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes an existing agent", () => {
      const agent = service.create({ name: "to-delete", port: 5000 });
      service.delete(agent.id);
      expect(service.list()).toHaveLength(0);
    });

    it("throws AgentNotFoundError when agent does not exist", () => {
      expect(() => service.delete(999)).toThrow(AgentNotFoundError);
    });

    it("only deletes the specified agent", () => {
      const a1 = service.create({ name: "keep", port: 6001 });
      const a2 = service.create({ name: "remove", port: 6002 });
      service.delete(a2.id);
      const remaining = service.list();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(a1.id);
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────────

  describe("findById", () => {
    it("returns the agent when found", () => {
      const agent = service.create({ name: "find-me", port: 7000 });
      expect(service.findById(agent.id)?.name).toBe("find-me");
    });

    it("returns undefined when not found", () => {
      expect(service.findById(9999)).toBeUndefined();
    });
  });
});
