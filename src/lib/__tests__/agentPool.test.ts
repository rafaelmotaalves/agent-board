import { describe, it, expect, beforeEach, mock } from "bun:test";
import { AgentPool } from "@/lib/agents/agentPool";
import { AgentService } from "@/lib/agents/agentService";
import type { Agent } from "@/lib/types";
import { Database } from "bun:sqlite";

function createDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      port INTEGER DEFAULT NULL,
      type TEXT NOT NULL DEFAULT 'copilot_cli_sdk',
      command TEXT DEFAULT NULL,
      folder TEXT NOT NULL,
      options TEXT NOT NULL DEFAULT '{}',
      source TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      agent_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'planning',
      state TEXT NOT NULL DEFAULT 'pending',
      failure_reason TEXT DEFAULT NULL,
      completed_at TEXT DEFAULT NULL,
      active_time_ms INTEGER NOT NULL DEFAULT 0,
      active_since TEXT DEFAULT NULL,
      archived_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  return db;
}

describe("AgentPool", () => {
  let agentService: AgentService;
  let pool: AgentPool;

  beforeEach(() => {
    const db = createDb();
    agentService = new AgentService(db);
    pool = new AgentPool(agentService);
  });

  describe("get", () => {
    it("loads a copilot_cli_sdk agent and returns a caller", async () => {
      const agent = agentService.create({ name: "Test Agent", port: 3000, folder: "/tmp" });
      const caller = await pool.get(agent.id);
      expect(caller).toBeDefined();
      expect(caller.sendMessage).toBeDefined();
      expect(caller.planTask).toBeDefined();
      expect(caller.executeTask).toBeDefined();
    });

    it("returns cached caller on subsequent calls with same config", async () => {
      const agent = agentService.create({ name: "Test Agent", port: 3000, folder: "/tmp" });
      const caller1 = await pool.get(agent.id);
      const caller2 = await pool.get(agent.id);
      expect(caller1).toBe(caller2);
    });

    it("returns a new caller when the agent command is updated", async () => {
      const agent = agentService.create({ name: "ACP Agent", folder: "/tmp", type: "acp", command: "old-cmd" });
      const caller1 = await pool.get(agent.id);
      agentService.update(agent.id, { command: "new-cmd" });
      const caller2 = await pool.get(agent.id);
      expect(caller2).not.toBe(caller1);
    });

    it("returns a new caller when the agent port is updated", async () => {
      const agent = agentService.create({ name: "SDK Agent", port: 3000, folder: "/tmp" });
      const caller1 = await pool.get(agent.id);
      agentService.update(agent.id, { port: 4000 });
      const caller2 = await pool.get(agent.id);
      expect(caller2).not.toBe(caller1);
    });

    it("shares cached caller for agents with same command and folder", async () => {
      const agent1 = agentService.create({ name: "ACP 1", folder: "/tmp", type: "acp", command: "same-cmd" });
      const agent2 = agentService.create({ name: "ACP 2", folder: "/tmp", type: "acp", command: "same-cmd" });
      const caller1 = await pool.get(agent1.id);
      const caller2 = await pool.get(agent2.id);
      expect(caller1).toBe(caller2);
    });

    it("throws when agent not found", async () => {
      expect(pool.get(999)).rejects.toThrow("not found");
    });

    it("loads an acp agent and returns a caller", async () => {
      const agent = agentService.create({ name: "ACP Agent", folder: "/tmp", type: "acp", command: "acp-run" });
      const caller = await pool.get(agent.id);
      expect(caller).toBeDefined();
    });
  });

  describe("getAgentOptions", () => {
    it("returns options for an existing agent", () => {
      const agent = agentService.create({ name: "Agent", port: 3000, folder: "/tmp", options: { parallel_planning: true } });
      const options = pool.getAgentOptions(agent.id);
      expect(options).toEqual({ parallel_planning: true });
    });

    it("returns undefined for non-existent agent", () => {
      const options = pool.getAgentOptions(999);
      expect(options).toBeUndefined();
    });
  });
});
