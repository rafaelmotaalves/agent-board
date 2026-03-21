#!/usr/bin/env node

// Postinstall script: builds the application if the dist output doesn't exist.
// This ensures that when installed via npx, the native modules (better-sqlite3)
// are compiled for the correct Node.js ABI version.

import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const serverPath = resolve(rootDir, "dist", "standalone", "server.js");

if (existsSync(serverPath)) {
  process.exit(0);
}

console.log("[agent-board] Building application...");
execSync("npm run build", { cwd: rootDir, stdio: "inherit" });
