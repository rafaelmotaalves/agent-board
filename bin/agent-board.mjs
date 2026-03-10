#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

// Parse --config <path> from argv and forward the rest to Next.js
const rawArgs = process.argv.slice(2);
let configPath = undefined;
const nextArgs = [];

for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === "--config" && i + 1 < rawArgs.length) {
    configPath = resolve(process.cwd(), rawArgs[++i]);
  } else {
    nextArgs.push(rawArgs[i]);
  }
}

const env = { ...process.env };
if (configPath) {
  env.AGENT_BOARD_CONFIG = configPath;
}

const bunBin = process.argv[0].endsWith("bun") ? process.argv[0] : "bun";
const workerScript = resolve(rootDir, "src", "worker.ts");

const children = [];

const worker = spawn(bunBin, ["run", workerScript], {
  stdio: "inherit",
  cwd: rootDir,
  env,
});
children.push(worker);

const server = spawn(bunBin, ["run", "next", "start", ...nextArgs], {
  stdio: "inherit",
  cwd: rootDir,
  env,
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
