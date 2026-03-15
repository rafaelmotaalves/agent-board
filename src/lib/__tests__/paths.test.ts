import { describe, it, expect } from "bun:test";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { DATA_DIR, DB_PATH, STREAMING_DIR, ensureDataDir } from "@/lib/paths";

describe("paths", () => {
  it("DATA_DIR is under home directory", () => {
    expect(DATA_DIR).toBe(path.join(os.homedir(), ".agent-board"));
  });

  it("DB_PATH is under DATA_DIR", () => {
    expect(DB_PATH).toBe(path.join(DATA_DIR, "agent-board.db"));
  });

  it("STREAMING_DIR is under DATA_DIR/tmp/messages", () => {
    expect(STREAMING_DIR).toBe(path.join(DATA_DIR, "tmp", "messages"));
  });

  it("ensureDataDir creates the streaming directory", () => {
    // This is safe to call — it creates dirs if not existing
    ensureDataDir();
    expect(fs.existsSync(STREAMING_DIR)).toBe(true);
  });
});
