#!/usr/bin/env bun

import { resolve } from "path";
import { spawnSync } from "child_process";

const commands: Record<string, string[]> = {
  dev: ["next", "dev"],
  build: ["next", "build"],
  start: ["next", "start"],
};

const arg = process.argv[2] ?? "dev";

const cmd = commands[arg];
if (!cmd) {
  console.error(`Unknown command: ${arg}`);
  console.error(`Available commands: ${Object.keys(commands).join(", ")}`);
  process.exit(1);
}

const projectDir = resolve(import.meta.dirname, "..");

const result = spawnSync("bun", ["--bun", ...cmd, ...process.argv.slice(3)], {
  cwd: projectDir,
  stdio: "inherit",
  env: { ...process.env },
});

process.exit(result.status ?? 1);
