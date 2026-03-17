/**
 * Disk-based streaming message store.
 *
 * While an agent message is being generated, its content is written to a
 * temporary markdown file at `~/.agent-board/tmp/messages/<messageId>.md`.  This avoids
 * high-frequency SQLite writes during streaming and lets the SSE route read
 * content changes directly from the filesystem at low latency.
 *
 * All writes use synchronous fs calls (`writeFileSync` / `appendFileSync`) so
 * that each chunk is immediately visible on disk to the SSE reader.
 *
 * Lifecycle:
 *   initStreamingFile()     → worker creates an empty file on disk
 *   appendStreamingChunk()  → worker appends each delta synchronously
 *   finalizeStreamingFile() → no-op (file stays for SSE reads)
 *   deleteStreamingFile()   → worker removes the file after content is saved to SQLite
 *   recover                 → on startup any leftover files are cleaned up
 */

import path from "node:path";
import fs from "node:fs";
import { STREAMING_DIR, ensureDataDir } from "@/lib/paths";

/** Interface for streaming store operations used by TaskWorker. */
export interface StreamingStore {
  initStreamingFile(messageId: number): void;
  appendStreamingChunk(messageId: number, chunk: string): void;
  finalizeStreamingFile(messageId: number): Promise<void>;
  deleteStreamingFile(messageId: number): void;
  cleanupAllStreamingFiles(): void;
}

function ensureDir(): void {
  ensureDataDir();
}

/** Absolute path to the temp file for a given message ID. */
export function getStreamingFilePath(messageId: number): string {
  return path.join(STREAMING_DIR, `${messageId}.md`);
}

/** Returns true when the temp file exists (i.e. the message is still streaming). */
export function streamingFileExists(messageId: number): boolean {
  return fs.existsSync(getStreamingFilePath(messageId));
}

/**
 * Create (or truncate) the temp file on disk.
 * Must be called once before any `appendStreamingChunk` calls.
 */
export function initStreamingFile(messageId: number): void {
  ensureDir();
  const filePath = getStreamingFilePath(messageId);
  fs.writeFileSync(filePath, "", "utf-8");
}

/**
 * Append a single delta chunk synchronously so the data is immediately
 * visible on disk to the SSE polling reader.
 */
export function appendStreamingChunk(messageId: number, chunk: string): void {
  fs.appendFileSync(getStreamingFilePath(messageId), chunk, "utf-8");
}

/**
 * Finalize streaming for a message.  Since writes are synchronous, there is
 * nothing to flush.  The file is kept on disk so the SSE route can still read
 * the final content before `deleteStreamingFile` is called.
 */
export function finalizeStreamingFile(_messageId: number): Promise<void> {
  return Promise.resolve();
}

/**
 * Read the current accumulated content from disk.
 * Returns `null` if the file does not exist.
 */
export function readStreamingContent(messageId: number): string | null {
  try {
    return fs.readFileSync(getStreamingFilePath(messageId), "utf-8");
  } catch {
    return null;
  }
}

/** Delete the temp file once the message has been finalised in SQLite. */
export function deleteStreamingFile(messageId: number): void {
  try {
    fs.unlinkSync(getStreamingFilePath(messageId));
  } catch {
    // File may already be gone — that's fine
  }
}

/**
 * Remove ALL leftover streaming files (called on worker startup to clean up
 * after a crash where files were never finalised).
 */
export function cleanupAllStreamingFiles(): void {
  try {
    if (!fs.existsSync(STREAMING_DIR)) return;
    const files = fs.readdirSync(STREAMING_DIR);
    for (const file of files) {
      if (file.endsWith(".md")) {
        try {
          fs.unlinkSync(path.join(STREAMING_DIR, file));
        } catch {
          // ignore individual failures
        }
      }
    }
  } catch {
    // ignore
  }
}

/** The default streaming store implementation backed by the real filesystem. */
export const defaultStreamingStore: StreamingStore = {
  initStreamingFile,
  appendStreamingChunk,
  finalizeStreamingFile,
  deleteStreamingFile,
  cleanupAllStreamingFiles,
};
