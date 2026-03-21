#!/usr/bin/env node

// Copies static assets and public files into the standalone directory
// so the standalone server can serve them without the full project tree.

import { cpSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const distDir = resolve(rootDir, "dist");
const standaloneDir = resolve(distDir, "standalone");

function copy(src, dest, label) {
  if (!existsSync(src)) {
    console.log(`[postbuild] Skipping ${label} (not found: ${src})`);
    return;
  }
  cpSync(src, dest, { recursive: true });
  console.log(`[postbuild] Copied ${label} → ${dest}`);
}

// Static assets (CSS, JS chunks) → standalone/dist/static
copy(
  resolve(distDir, "static"),
  resolve(standaloneDir, "dist", "static"),
  "static assets"
);

// Public files → standalone/public
copy(
  resolve(rootDir, "public"),
  resolve(standaloneDir, "public"),
  "public files"
);

console.log("[postbuild] Done.");
