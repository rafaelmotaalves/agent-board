import { Database } from "bun:sqlite";
import path from 'node:path';
import type { Task, TaskState, Agent, AgentOptions, TaskMessage } from "@/lib/types";
export type { Task, TaskState, Agent, AgentOptions, TaskMessage };
export { isValidState } from "@/lib/types";

const DB_PATH = path.join(process.cwd(), "agent-board.db");

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.exec("PRAGMA journal_mode = WAL");
    _db.exec("PRAGMA foreign_keys = ON");
    _db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
        status TEXT NOT NULL DEFAULT 'planning',
        state TEXT NOT NULL DEFAULT 'pending',
        failure_reason TEXT DEFAULT NULL,
        completed_at TEXT DEFAULT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      )
    `);
    // Migrations: add columns if they don't exist (for existing DBs)
    const cols = (_db.query("PRAGMA table_info(tasks)").all() as { name: string }[]).map(
      (c) => c.name
    );
    if (!cols.includes("state")) {
      _db.exec("ALTER TABLE tasks ADD COLUMN state TEXT NOT NULL DEFAULT 'pending'");
    }
    if (!cols.includes("agent_id")) {
      _db.exec("ALTER TABLE tasks ADD COLUMN agent_id INTEGER REFERENCES agents(id) ON DELETE RESTRICT");
    }
    if (!cols.includes("failure_reason")) {
      _db.exec("ALTER TABLE tasks ADD COLUMN failure_reason TEXT DEFAULT NULL");
    }
    if (!cols.includes("completed_at")) {
      _db.exec("ALTER TABLE tasks ADD COLUMN completed_at TEXT DEFAULT NULL");
    }

    _db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        port INTEGER NOT NULL UNIQUE,
        options TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      )
    `);

    // Migration: add options column if it doesn't exist (for existing DBs)
    const agentCols = (_db.query("PRAGMA table_info(agents)").all() as { name: string }[]).map(
      (c) => c.name
    );
    if (!agentCols.includes("options")) {
      _db.exec("ALTER TABLE agents ADD COLUMN options TEXT NOT NULL DEFAULT '{}'");
    }

    _db.exec(`
      CREATE TABLE IF NOT EXISTS task_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'user',
        content TEXT NOT NULL,
        task_state_at_creation TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      )
    `);
    // Migration: add role column if it doesn't exist (for existing DBs)
    const msgCols = (_db.query("PRAGMA table_info(task_messages)").all() as { name: string }[]).map(
      (c) => c.name
    );
    if (!msgCols.includes("role")) {
      _db.exec("ALTER TABLE task_messages ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
    }
    if (!msgCols.includes("is_complete")) {
      _db.exec("ALTER TABLE task_messages ADD COLUMN is_complete INTEGER NOT NULL DEFAULT 1");
    }
  }
  return _db;
}
