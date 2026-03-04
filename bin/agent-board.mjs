#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const args = process.argv.slice(2);

const nextBin = resolve(rootDir, "node_modules", ".bin", "next");

const nextDir = resolve(rootDir, ".next");
if (!existsSync(nextDir)) {
  console.log("Building agent-board...");
  execFileSync(nextBin, ["build"], { stdio: "inherit", cwd: rootDir });
}

execFileSync(nextBin, ["start", ...args], {
  stdio: "inherit",
  cwd: rootDir,
});
