import path from "node:path";
import os from "node:os";
import fs from "node:fs";

export const DATA_DIR = path.join(os.homedir(), ".agent-board");
export const DB_PATH = path.join(DATA_DIR, "agent-board.db");
export const STREAMING_DIR = path.join(DATA_DIR, "tmp", "messages");

/** Ensure the data directory and all subdirectories exist. */
export function ensureDataDir(): void {
  fs.mkdirSync(STREAMING_DIR, { recursive: true });
}
