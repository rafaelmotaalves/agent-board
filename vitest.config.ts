import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "happy-dom",
    server: {
      deps: {
        inline: ["@github/copilot-sdk"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "bun:sqlite": "better-sqlite3",
      bun: path.resolve(__dirname, "./src/__mocks__/bun.ts"),
    },
  },
});
