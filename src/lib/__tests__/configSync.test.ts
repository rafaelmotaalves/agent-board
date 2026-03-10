import { describe, it, expect, beforeEach } from "@jest/globals";
import Database from "better-sqlite3";
import { AgentService } from "@/lib/agents";
import { syncAgentsFromConfig } from "@/lib/configSync";
import type { BoardConfig } from "@/lib/config";

function createDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      port INTEGER DEFAULT NULL,
      type TEXT NOT NULL DEFAULT 'copilot_cli_sdk',
      command TEXT DEFAULT NULL,
      folder TEXT NOT NULL,
      options TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
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

describe("syncAgentsFromConfig", () => {
  let service: AgentService;

  beforeEach(() => {
    service = new AgentService(createDb());
  });

  it("creates agents that don't exist", () => {
    const config: BoardConfig = {
      agents: [
        { name: "New Agent", type: "copilot_cli_sdk", port: 8000, folder: "/work" },
      ],
    };
    syncAgentsFromConfig(config, service);

    const agents = service.list();
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe("New Agent");
    expect(agents[0].port).toBe(8000);
  });

  it("creates multiple agents", () => {
    const config: BoardConfig = {
      agents: [
        { name: "Agent A", type: "copilot_cli_sdk", port: 8001, folder: "/a" },
        { name: "Agent B", type: "acp", command: "python run.py", folder: "/b" },
      ],
    };
    syncAgentsFromConfig(config, service);
    expect(service.list()).toHaveLength(2);
  });

  it("skips agents that already exist and are unchanged", () => {
    service.create({ name: "Existing", port: 8000, folder: "/work" });
    const config: BoardConfig = {
      agents: [
        { name: "Existing", type: "copilot_cli_sdk", port: 8000, folder: "/work" },
      ],
    };
    syncAgentsFromConfig(config, service);

    const agents = service.list();
    expect(agents).toHaveLength(1);
  });

  it("updates agents when fields differ", () => {
    service.create({ name: "Update Me", port: 8000, folder: "/old" });
    const config: BoardConfig = {
      agents: [
        { name: "Update Me", type: "copilot_cli_sdk", port: 8000, folder: "/new" },
      ],
    };
    syncAgentsFromConfig(config, service);

    const agents = service.list();
    expect(agents).toHaveLength(1);
    expect(agents[0].folder).toBe("/new");
  });

  it("updates agents when port differs", () => {
    service.create({ name: "Port Agent", port: 3000, folder: "/work" });
    const config: BoardConfig = {
      agents: [
        { name: "Port Agent", type: "copilot_cli_sdk", port: 4000, folder: "/work" },
      ],
    };
    syncAgentsFromConfig(config, service);

    const agents = service.list();
    expect(agents[0].port).toBe(4000);
  });

  it("updates agents when options differ", () => {
    service.create({ name: "Opts Agent", port: 5000, folder: "/work" });
    const config: BoardConfig = {
      agents: [
        { name: "Opts Agent", type: "copilot_cli_sdk", port: 5000, folder: "/work", options: { parallel_planning: true } },
      ],
    };
    syncAgentsFromConfig(config, service);

    const agents = service.list();
    expect(agents[0].options).toEqual({ parallel_planning: true });
  });

  it("does not delete agents missing from config", () => {
    service.create({ name: "Keep Me", port: 9000, folder: "/keep" });
    const config: BoardConfig = {
      agents: [
        { name: "New Agent", type: "copilot_cli_sdk", port: 9001, folder: "/new" },
      ],
    };
    syncAgentsFromConfig(config, service);

    const agents = service.list();
    expect(agents).toHaveLength(2);
    expect(agents.find((a) => a.name === "Keep Me")).toBeDefined();
    expect(agents.find((a) => a.name === "New Agent")).toBeDefined();
  });

  it("handles empty agents array", () => {
    service.create({ name: "Untouched", port: 7000, folder: "/work" });
    syncAgentsFromConfig({ agents: [] }, service);
    expect(service.list()).toHaveLength(1);
  });
});
