import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  getStreamingFilePath,
  streamingFileExists,
  initStreamingFile,
  appendStreamingChunk,
  finalizeStreamingFile,
  readStreamingContent,
  deleteStreamingFile,
  cleanupAllStreamingFiles,
} from "@/lib/streamingStore";
import { STREAMING_DIR } from "@/lib/paths";

describe("streamingStore", () => {
  // Use a high message ID to avoid collisions
  let nextId = 900000;
  function nextMsgId() {
    return nextId++;
  }

  afterEach(() => {
    // Clean up any leftover files from our tests
    cleanupAllStreamingFiles();
  });

  describe("getStreamingFilePath", () => {
    it("returns path under STREAMING_DIR with .md extension", () => {
      const p = getStreamingFilePath(123);
      expect(p).toBe(path.join(STREAMING_DIR, "123.md"));
    });
  });

  describe("streamingFileExists", () => {
    it("returns false for non-existent file", () => {
      expect(streamingFileExists(999999)).toBe(false);
    });

    it("returns true after init", () => {
      const id = nextMsgId();
      initStreamingFile(id);
      expect(streamingFileExists(id)).toBe(true);
    });
  });

  describe("initStreamingFile", () => {
    it("creates an empty file", () => {
      const id = nextMsgId();
      initStreamingFile(id);
      const content = fs.readFileSync(getStreamingFilePath(id), "utf-8");
      expect(content).toBe("");
    });

    it("truncates existing file", () => {
      const id = nextMsgId();
      initStreamingFile(id);
      appendStreamingChunk(id, "hello");
      // Re-init should truncate
      initStreamingFile(id);
      const content = fs.readFileSync(getStreamingFilePath(id), "utf-8");
      expect(content).toBe("");
    });
  });

  describe("appendStreamingChunk", () => {
    it("appends chunks to the open stream", async () => {
      const id = nextMsgId();
      initStreamingFile(id);
      appendStreamingChunk(id, "hello ");
      appendStreamingChunk(id, "world");
      // Finalize to flush
      await finalizeStreamingFile(id);
      const content = fs.readFileSync(getStreamingFilePath(id), "utf-8");
      expect(content).toBe("hello world");
    });

    it("falls back to appendFileSync when no stream is open", () => {
      const id = nextMsgId();
      // Create the file manually without using initStreamingFile
      const filePath = getStreamingFilePath(id);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, "", "utf-8");
      // appendStreamingChunk without init should use appendFileSync
      appendStreamingChunk(id, "fallback content");
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toBe("fallback content");
    });
  });

  describe("finalizeStreamingFile", () => {
    it("resolves even when no stream is open", async () => {
      const id = nextMsgId();
      // Should not throw
      await finalizeStreamingFile(id);
    });

    it("closes the write stream", async () => {
      const id = nextMsgId();
      initStreamingFile(id);
      appendStreamingChunk(id, "data");
      await finalizeStreamingFile(id);
      // File should still exist after finalize
      expect(streamingFileExists(id)).toBe(true);
    });
  });

  describe("readStreamingContent", () => {
    it("returns null when file does not exist", () => {
      expect(readStreamingContent(999999)).toBeNull();
    });

    it("returns content from the file", async () => {
      const id = nextMsgId();
      initStreamingFile(id);
      appendStreamingChunk(id, "streaming content");
      await finalizeStreamingFile(id);
      const content = readStreamingContent(id);
      expect(content).toBe("streaming content");
    });
  });

  describe("deleteStreamingFile", () => {
    it("removes the file", () => {
      const id = nextMsgId();
      initStreamingFile(id);
      deleteStreamingFile(id);
      expect(streamingFileExists(id)).toBe(false);
    });

    it("does not throw when file does not exist", () => {
      expect(() => deleteStreamingFile(999999)).not.toThrow();
    });

    it("destroys the open stream", async () => {
      const id = nextMsgId();
      initStreamingFile(id);
      appendStreamingChunk(id, "data");
      deleteStreamingFile(id);
      expect(streamingFileExists(id)).toBe(false);
    });
  });

  describe("cleanupAllStreamingFiles", () => {
    it("removes all .md files from the streaming directory", () => {
      const id1 = nextMsgId();
      const id2 = nextMsgId();
      initStreamingFile(id1);
      initStreamingFile(id2);
      cleanupAllStreamingFiles();
      expect(streamingFileExists(id1)).toBe(false);
      expect(streamingFileExists(id2)).toBe(false);
    });
  });
});
