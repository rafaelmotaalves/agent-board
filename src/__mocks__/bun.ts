// Stub for Bun runtime APIs used in production code.
// Tests that need actual subprocess spawning should be run under Bun directly.
export function spawn() {
  throw new Error("bun.spawn is not available in Vitest");
}

export type Subprocess = unknown;
export type FileSink = unknown;
