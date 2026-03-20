import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      bun: path.resolve(__dirname, "./src/__mocks__/bun.ts"),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["src/**/__tests__/*.test.{ts,tsx}"],
    server: {
      deps: {
        // Inline @github/copilot-sdk so vscode-jsonrpc resolves correctly
        inline: ["@github/copilot-sdk"],
      },
    },
  },
});
