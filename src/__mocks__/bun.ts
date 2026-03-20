// Mock for "bun" module — used by Vitest since native Bun APIs are unavailable in Node.js
export function spawn() {
  throw new Error("bun.spawn is not available in Vitest");
}
export class FileSink {}
