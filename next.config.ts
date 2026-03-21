import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: "dist",
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingRoot: import.meta.dirname,
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
