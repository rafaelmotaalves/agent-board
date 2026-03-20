import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { AgentService, AgentValidationError, AgentNotFoundError, AgentConfigError } from "@/lib/agents";

function createDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      port INTEGER NOT NULL UNIQUE,
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

describe("AgentService", () => {
  let service: AgentService;

  beforeEach(() => {
    service = new AgentService(createDb());
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates an agent with name and port", () => {
      const agent = service.create({ name: "my-agent", port: 8080, folder: "/work" });
      expect(agent.id).toBeDefined();
      expect(agent.name).toBe("my-agent");
      expect(agent.port).toBe(8080);
      expect(agent.created_at).toBeDefined();
    });

    it("trims the name", () => {
      const agent = service.create({ name: "  trim me  ", port: 3000, folder: "/work" });
      expect(agent.name).toBe("trim me");
    });

    it("throws AgentValidationError when name is empty", () => {
      expect(() => service.create({ name: "", port: 8080, folder: "/work" })).toThrow(AgentValidationError);
      expect(() => service.create({ name: "   ", port: 8080, folder: "/work" })).toThrow(AgentValidationError);
    });

    it("throws AgentValidationError when port is out of range", () => {
      expect(() => service.create({ name: "agent", port: 0, folder: "/work" })).toThrow(AgentValidationError);
      expect(() => service.create({ name: "agent", port: 65536, folder: "/work" })).toThrow(AgentValidationError);
      expect(() => service.create({ name: "agent", port: -1, folder: "/work" })).toThrow(AgentValidationError);
    });

    it("throws AgentValidationError when port is not an integer", () => {
      expect(() => service.create({ name: "agent", port: 3.14, folder: "/work" })).toThrow(AgentValidationError);
    });

    it("accepts valid boundary ports", () => {
      const a1 = service.create({ name: "agent-min", port: 1, folder: "/work" });
      expect(a1.port).toBe(1);
      const a2 = service.create({ name: "agent-max", port: 65535, folder: "/work" });
      expect(a2.port).toBe(65535);
    });

    it("throws AgentValidationError when folder is empty", () => {
      expect(() => service.create({ name: "agent", port: 8080, folder: "" })).toThrow(AgentValidationError);
      expect(() => service.create({ name: "agent", port: 8080, folder: "   " })).toThrow(AgentValidationError);
    });

    it("trims the folder", () => {
      const agent = service.create({ name: "agent", port: 8080, folder: "  /my/dir  " });
      expect(agent.folder).toBe("/my/dir");
    });
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe("list", () => {
    it("returns empty array when no agents", () => {
      expect(service.list()).toHaveLength(0);
    });

    it("lists all created agents", () => {
      service.create({ name: "agent-1", port: 3001, folder: "/work" });
      service.create({ name: "agent-2", port: 3002, folder: "/work" });
      expect(service.list()).toHaveLength(2);
    });

    it("returns all created agents in the list", () => {
      const a1 = service.create({ name: "first", port: 4001, folder: "/work" });
      const a2 = service.create({ name: "second", port: 4002, folder: "/work" });
      const list = service.list();
      expect(list).toHaveLength(2);
      expect(list.find((a) => a.id === a1.id)).toBeDefined();
      expect(list.find((a) => a.id === a2.id)).toBeDefined();
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes an existing agent", () => {
      const agent = service.create({ name: "to-delete", port: 5000, folder: "/work" });
      service.delete(agent.id);
      expect(service.list()).toHaveLength(0);
    });

    it("throws AgentNotFoundError when agent does not exist", () => {
      expect(() => service.delete(999)).toThrow(AgentNotFoundError);
    });

    it("only deletes the specified agent", () => {
      const a1 = service.create({ name: "keep", port: 6001, folder: "/work" });
      const a2 = service.create({ name: "remove", port: 6002, folder: "/work" });
      service.delete(a2.id);
      const remaining = service.list();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(a1.id);
    });

    it("throws AgentValidationError when agent has non-done tasks", () => {
      const agent = service.create({ name: "busy-agent", port: 6003, folder: "/work" });
      const db = (service as unknown as { db: Database }).db;
      db.prepare("INSERT INTO tasks (title, agent_id) VALUES (?, ?)").run("task-1", agent.id);
      expect(() => service.delete(agent.id)).toThrow(AgentValidationError);
    });

    it("allows deletion when all tasks are in done status", () => {
      const agent = service.create({ name: "done-agent", port: 6004, folder: "/work" });
      const db = (service as unknown as { db: Database }).db;
      db.prepare("INSERT INTO tasks (title, agent_id, status) VALUES (?, ?, 'done')").run("done-task", agent.id);
      service.delete(agent.id);
      expect(service.list()).toHaveLength(0);
    });

    it("blocks deletion when agent has a mix of done and non-done tasks", () => {
      const agent = service.create({ name: "mixed-agent", port: 6005, folder: "/work" });
      const db = (service as unknown as { db: Database }).db;
      db.prepare("INSERT INTO tasks (title, agent_id, status) VALUES (?, ?, 'done')").run("done-task", agent.id);
      db.prepare("INSERT INTO tasks (title, agent_id, status) VALUES (?, ?, 'planning')").run("active-task", agent.id);
      expect(() => service.delete(agent.id)).toThrow(AgentValidationError);
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────────

  describe("findById", () => {
    it("returns the agent when found", () => {
      const agent = service.create({ name: "find-me", port: 7000, folder: "/work" });
      expect(service.findById(agent.id)?.name).toBe("find-me");
    });

    it("returns undefined when not found", () => {
      expect(service.findById(9999)).toBeUndefined();
    });
  });

  // ── options ────────────────────────────────────────────────────────────────

  describe("options", () => {
    it("creates an agent with default empty options", () => {
      const agent = service.create({ name: "no-opts", port: 7100, folder: "/work" });
      expect(agent.options).toEqual({});
    });

    it("creates an agent with parallel_planning option", () => {
      const agent = service.create({
        name: "parallel",
        port: 7200,
        folder: "/work",
        options: { parallel_planning: true },
      });
      expect(agent.options).toEqual({ parallel_planning: true });
    });

    it("persists options through findById", () => {
      const agent = service.create({
        name: "persist-opts",
        port: 7300,
        folder: "/work",
        options: { parallel_planning: true },
      });
      const found = service.findById(agent.id)!;
      expect(found.options.parallel_planning).toBe(true);
    });

    it("persists options through list", () => {
      service.create({
        name: "list-opts",
        port: 7400,
        folder: "/work",
        options: { parallel_planning: true },
      });
      const agents = service.list();
      expect(agents[0].options.parallel_planning).toBe(true);
    });
  });

  // ── type ──────────────────────────────────────────────────────────────────

  describe("type", () => {
    it("creates an agent with default type copilot_cli_sdk", () => {
      const agent = service.create({ name: "default-type", port: 7500, folder: "/work" });
      expect(agent.type).toBe("copilot_cli_sdk");
    });

    it("creates an agent with explicit type", () => {
      const agent = service.create({ name: "explicit-type", port: 7501, folder: "/work", type: "copilot_cli_sdk" });
      expect(agent.type).toBe("copilot_cli_sdk");
    });

    it("throws AgentValidationError for invalid type", () => {
      expect(() =>
        service.create({ name: "bad-type", port: 7502, folder: "/work", type: "nonexistent" as never })
      ).toThrow(AgentValidationError);
    });

    it("persists type through findById", () => {
      const agent = service.create({ name: "persist-type", port: 7503, folder: "/work" });
      const found = service.findById(agent.id)!;
      expect(found.type).toBe("copilot_cli_sdk");
    });

    it("persists type through list", () => {
      service.create({ name: "list-type", port: 7504, folder: "/work" });
      const agents = service.list();
      expect(agents[0].type).toBe("copilot_cli_sdk");
    });

    it("preserves type when not provided in update", () => {
      const agent = service.create({ name: "keep-type", port: 7505, folder: "/work" });
      const updated = service.update(agent.id, { name: "renamed" });
      expect(updated.type).toBe("copilot_cli_sdk");
    });

    it("throws AgentValidationError when updating with invalid type", () => {
      const agent = service.create({ name: "upd-type", port: 7506, folder: "/work" });
      expect(() =>
        service.update(agent.id, { type: "invalid" as never })
      ).toThrow(AgentValidationError);
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe("update", () => {
    it("updates agent options", () => {
      const agent = service.create({ name: "upd", port: 8100, folder: "/work" });
      const updated = service.update(agent.id, { options: { parallel_planning: true } });
      expect(updated.options.parallel_planning).toBe(true);
    });

    it("updates agent name", () => {
      const agent = service.create({ name: "old-name", port: 8200, folder: "/work" });
      const updated = service.update(agent.id, { name: "new-name" });
      expect(updated.name).toBe("new-name");
    });

    it("throws AgentNotFoundError when updating non-existent agent", () => {
      expect(() => service.update(999, { name: "nope" })).toThrow(AgentNotFoundError);
    });

    it("preserves existing options when not provided in update", () => {
      const agent = service.create({
        name: "keep-opts",
        port: 8300,
        folder: "/work",
        options: { parallel_planning: true },
      });
      const updated = service.update(agent.id, { name: "renamed" });
      expect(updated.options.parallel_planning).toBe(true);
    });

    it("throws AgentValidationError when updating with an empty name", () => {
      const agent = service.create({ name: "valid", port: 8400, folder: "/work" });
      expect(() => service.update(agent.id, { name: "" })).toThrow(AgentValidationError);
      expect(() => service.update(agent.id, { name: "   " })).toThrow(AgentValidationError);
    });

    it("throws AgentValidationError when updating with an invalid port", () => {
      const agent = service.create({ name: "porttest", port: 8500, folder: "/work" });
      expect(() => service.update(agent.id, { port: 0 })).toThrow(AgentValidationError);
      expect(() => service.update(agent.id, { port: 65536 })).toThrow(AgentValidationError);
      expect(() => service.update(agent.id, { port: 3.5 })).toThrow(AgentValidationError);
    });

    it("updates agent port", () => {
      const agent = service.create({ name: "portchange", port: 8600, folder: "/work" });
      const updated = service.update(agent.id, { port: 8601 });
      expect(updated.port).toBe(8601);
    });

    it("trims the name when updating", () => {
      const agent = service.create({ name: "trimtest", port: 8700, folder: "/work" });
      const updated = service.update(agent.id, { name: "  trimmed  " });
      expect(updated.name).toBe("trimmed");
    });

    it("throws AgentValidationError when updating with an empty folder", () => {
      const agent = service.create({ name: "foldertest", port: 8800, folder: "/work" });
      expect(() => service.update(agent.id, { folder: "" })).toThrow(AgentValidationError);
      expect(() => service.update(agent.id, { folder: "   " })).toThrow(AgentValidationError);
    });

    it("updates agent folder", () => {
      const agent = service.create({ name: "folderupd", port: 8900, folder: "/work" });
      const updated = service.update(agent.id, { folder: "/new/dir" });
      expect(updated.folder).toBe("/new/dir");
    });

    it("preserves existing folder when not provided in update", () => {
      const agent = service.create({ name: "keepfolder", port: 8950, folder: "/original" });
      const updated = service.update(agent.id, { name: "renamed" });
      expect(updated.folder).toBe("/original");
    });
  });

  // ── duplicate port ─────────────────────────────────────────────────────────

  describe("duplicate port", () => {
    it("throws when creating an agent with a duplicate port", () => {
      service.create({ name: "first", port: 9000, folder: "/work" });
      expect(() => service.create({ name: "second", port: 9000, folder: "/work" })).toThrow();
    });
  });

  // ── source field ──────────────────────────────────────────────────────────

  describe("source", () => {
    it("defaults source to 'user'", () => {
      const agent = service.create({ name: "user-agent", port: 9100, folder: "/work" });
      expect(agent.source).toBe("user");
    });

    it("creates agent with source 'config'", () => {
      const agent = service.create({ name: "config-agent", port: 9200, folder: "/work", source: "config" });
      expect(agent.source).toBe("config");
    });

    it("persists source through findById", () => {
      const agent = service.create({ name: "persist-src", port: 9300, folder: "/work", source: "config" });
      const found = service.findById(agent.id)!;
      expect(found.source).toBe("config");
    });

    it("persists source through list", () => {
      service.create({ name: "list-src", port: 9400, folder: "/work", source: "config" });
      const agents = service.list();
      expect(agents[0].source).toBe("config");
    });
  });

  // ── config guard ──────────────────────────────────────────────────────────

  describe("config guard", () => {
    it("throws AgentConfigError when updating a config-sourced agent", () => {
      const agent = service.create({ name: "cfg", port: 9500, folder: "/work", source: "config" });
      expect(() => service.update(agent.id, { name: "new-name" })).toThrow(AgentConfigError);
    });

    it("throws AgentConfigError when deleting a config-sourced agent", () => {
      const agent = service.create({ name: "cfg-del", port: 9600, folder: "/work", source: "config" });
      expect(() => service.delete(agent.id)).toThrow(AgentConfigError);
    });

    it("allows updating a user-sourced agent", () => {
      const agent = service.create({ name: "usr", port: 9700, folder: "/work" });
      const updated = service.update(agent.id, { name: "renamed" });
      expect(updated.name).toBe("renamed");
    });

    it("allows deleting a user-sourced agent", () => {
      const agent = service.create({ name: "usr-del", port: 9800, folder: "/work" });
      service.delete(agent.id);
      expect(service.list()).toHaveLength(0);
    });

    it("allows updateFromConfig on config-sourced agents", () => {
      const agent = service.create({ name: "cfg-upd", port: 9900, folder: "/work", source: "config" });
      const updated = service.updateFromConfig(agent.id, { folder: "/new" });
      expect(updated.folder).toBe("/new");
    });
  });
});
