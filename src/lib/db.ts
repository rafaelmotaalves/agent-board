import Database from "better-sqlite3";
import type { Task, TaskState, Agent, AgentOptions, AgentType, TaskMessage, ToolCall, TaskUsage } from "@/lib/types";
export type { Task, TaskState, Agent, AgentOptions, AgentType, TaskMessage, ToolCall, TaskUsage };
export { isValidState, isValidAgentType, AGENT_TYPES, DEFAULT_AGENT_TYPE } from "@/lib/types";
import { DB_PATH, ensureDataDir } from "@/lib/paths";

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) {
    ensureDataDir();
    _db = new Database(DB_PATH);
    _db.exec("PRAGMA journal_mode = WAL");
    _db.exec("PRAGMA foreign_keys = ON");
    _db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        port INTEGER DEFAULT NULL,
        type TEXT NOT NULL DEFAULT 'copilot_cli_sdk',
        command TEXT DEFAULT NULL,
        folder TEXT NOT NULL,
        options TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      )
    `);
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
        active_time_ms INTEGER NOT NULL DEFAULT 0,
        active_since TEXT DEFAULT NULL,
        archived_at TEXT DEFAULT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      )
    `);
    _db.exec(`
      CREATE TABLE IF NOT EXISTS task_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'user',
        content TEXT NOT NULL,
        task_state_at_creation TEXT NOT NULL,
        is_complete INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      )
    `);
    _db.exec(`
      CREATE TABLE IF NOT EXISTS task_tool_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        tool_call_id TEXT,
        tool_name TEXT NOT NULL,
        kind TEXT DEFAULT NULL,
        input TEXT,
        output TEXT DEFAULT NULL,
        status TEXT NOT NULL DEFAULT 'running',
        task_state_at_creation TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        completed_at TEXT DEFAULT NULL
      )
    `);
    _db.exec(`
      CREATE TABLE IF NOT EXISTS task_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        token_limit INTEGER NOT NULL DEFAULT 0,
        used_tokens INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        UNIQUE(task_id, status)
      )
    `);
  }
  return _db;
}

