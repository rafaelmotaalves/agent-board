/**
 * Disk-based streaming message store.
 *
 * While an agent message is being generated, its content is written to a
 * temporary markdown file at `tmp/messages/<messageId>.md`.  This avoids
 * high-frequency SQLite writes during streaming and lets the SSE route read
 * content changes directly from the filesystem at low latency.
 *
 * Lifecycle:
 *   initStreamingFile()     → worker creates the file and opens a WriteStream
 *   appendStreamingChunk()  → worker appends each delta — no read, no full rewrite
 *   finalizeStreamingFile() → worker closes the WriteStream (file stays for SSE reads)
 *   deleteStreamingFile()   → worker removes the file after content is saved to SQLite
 *   recover                 → on startup any leftover files are cleaned up
 */

import path from "node:path";
import fs from "node:fs";

const STREAMING_DIR = path.join(process.cwd(), "tmp", "messages");

/** Open write streams keyed by messageId. */
const openStreams = new Map<number, fs.WriteStream>();

function ensureDir(): void {
  fs.mkdirSync(STREAMING_DIR, { recursive: true });
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
 * Create (or truncate) the temp file and open an append WriteStream for it.
 * Must be called once before any `appendStreamingChunk` calls.
 */
export function initStreamingFile(messageId: number): void {
  ensureDir();
  const filePath = getStreamingFilePath(messageId);
  // Truncate to start fresh, then open a persistent append stream.
  fs.writeFileSync(filePath, "", "utf-8");
  const stream = fs.createWriteStream(filePath, { flags: "a", encoding: "utf-8" });
  openStreams.set(messageId, stream);
}

/**
 * Append a single delta chunk to the open WriteStream.
 * Falls back to a direct appendFileSync if no stream is open (e.g. after a crash recovery).
 */
export function appendStreamingChunk(messageId: number, chunk: string): void {
  const stream = openStreams.get(messageId);
  if (stream) {
    stream.write(chunk);
  } else {
    fs.appendFileSync(getStreamingFilePath(messageId), chunk, "utf-8");
  }
}

/**
 * Close the WriteStream for a message.  The file is kept on disk so the SSE
 * route can still read the final content before `deleteStreamingFile` is called.
 */
export function finalizeStreamingFile(messageId: number): Promise<void> {
  return new Promise((resolve) => {
    const stream = openStreams.get(messageId);
    openStreams.delete(messageId);
    if (stream) {
      stream.end(resolve);
    } else {
      resolve();
    }
  });
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

/** Close any open stream and delete the temp file once the message has been finalised in SQLite. */
export function deleteStreamingFile(messageId: number): void {
  const stream = openStreams.get(messageId);
  openStreams.delete(messageId);
  if (stream) {
    stream.destroy();
  }
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
  // Close any lingering streams first.
  for (const [, stream] of openStreams) {
    stream.destroy();
  }
  openStreams.clear();

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
