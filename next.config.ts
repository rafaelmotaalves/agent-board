import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: "dist",
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
