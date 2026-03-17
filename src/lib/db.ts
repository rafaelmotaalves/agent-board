import { Database } from "bun:sqlite";
import path from 'node:path';
import type { Task, TaskState, Agent, TaskMessage } from "@/lib/types";
export type { Task, TaskState, Agent, TaskMessage };
export { isValidState } from "@/lib/types";

const DB_PATH = path.join(process.cwd(), "ai-board.db");

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
        agent_id INTEGER DEFAULT NULL REFERENCES agents(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'planning',
        state TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
      _db.exec("ALTER TABLE tasks ADD COLUMN agent_id INTEGER DEFAULT NULL REFERENCES agents(id) ON DELETE SET NULL");
    }

    _db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        port INTEGER NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    _db.exec(`
      CREATE TABLE IF NOT EXISTS task_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'user',
        content TEXT NOT NULL,
        task_state_at_creation TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    // Migration: add role column if it doesn't exist (for existing DBs)
    const msgCols = (_db.query("PRAGMA table_info(task_messages)").all() as { name: string }[]).map(
      (c) => c.name
    );
    if (!msgCols.includes("role")) {
      _db.exec("ALTER TABLE task_messages ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
    }
  }
  return _db;
}
