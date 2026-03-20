#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

// Parse --config <path> and --port/-p <port> from argv; forward the rest to Next.js
const rawArgs = process.argv.slice(2);
let configPath = undefined;
let port = undefined;
const nextArgs = [];

for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === "--config" && i + 1 < rawArgs.length) {
    configPath = resolve(process.cwd(), rawArgs[++i]);
  } else if ((rawArgs[i] === "--port" || rawArgs[i] === "-p") && i + 1 < rawArgs.length) {
    port = rawArgs[++i];
    if (isNaN(Number(port)) || Number(port) < 1 || Number(port) > 65535) {
      console.error(`Invalid port: ${port}`);
      process.exit(1);
    }
    nextArgs.push("--port", port);
  } else {
    nextArgs.push(rawArgs[i]);
  }
}

const env = { ...process.env };
if (configPath) {
  env.AGENT_BOARD_CONFIG = configPath;
}
if (port) {
  env.PORT = port;
}

const workerScript = resolve(rootDir, "src", "worker.ts");

const children = [];

const worker = spawn(process.execPath, ["--import", "tsx", workerScript], {
  stdio: "inherit",
  cwd: rootDir,
  env,
});
children.push(worker);

const nextBin = resolve(rootDir, "node_modules", "next", "dist", "bin", "next");
const server = spawn(process.execPath, [nextBin, "start", ...nextArgs], {
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
