import { Database } from "bun:sqlite";
import path from 'node:path';
import type { Task, TaskState } from "@/lib/types";
export type { Task, TaskState };
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
    if (!cols.includes("plan")) {
      _db.exec("ALTER TABLE tasks ADD COLUMN plan TEXT DEFAULT NULL");
    }
  }
  return _db;
}
