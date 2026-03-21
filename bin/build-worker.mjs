#!/usr/bin/env node

// Bundles src/worker.ts into dist/worker.mjs so it can run without tsx at runtime.

import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/worker.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist/worker.mjs",
  external: ["better-sqlite3"],
  tsconfig: "tsconfig.json",
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});

console.log("[build-worker] Bundled worker → dist/worker.mjs");
