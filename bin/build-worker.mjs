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
  packages: "external",
  tsconfig: "tsconfig.json",
});

console.log("[build-worker] Bundled worker → dist/worker.mjs");
