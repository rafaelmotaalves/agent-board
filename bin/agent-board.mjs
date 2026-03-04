#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const args = process.argv.slice(2);

const nextBin = resolve(rootDir, "node_modules", ".bin", "next");
const bunBin = process.argv[0].endsWith("bun") ? process.argv[0] : "bun";
const workerScript = resolve(rootDir, "src", "worker.ts");

const nextDir = resolve(rootDir, ".next");
if (!existsSync(nextDir)) {
  console.log("Building agent-board...");
  execFileSync(nextBin, ["build"], { stdio: "inherit", cwd: rootDir });
}

const children = [];

const worker = spawn(bunBin, ["run", workerScript], {
  stdio: "inherit",
  cwd: rootDir,
});
children.push(worker);

const server = spawn(nextBin, ["start", ...args], {
  stdio: "inherit",
  cwd: rootDir,
});
children.push(server);

function shutdown() {
  for (const child of children) {
    child.kill();
  }
}

server.on("exit", (code) => {
  shutdown();
  process.exit(code ?? 1);
});

worker.on("exit", (code) => {
  shutdown();
  process.exit(code ?? 1);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
