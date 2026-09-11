import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pino uses worker transports that must not be bundled by webpack/turbopack.
  serverExternalPackages: ["pino", "pino-pretty"],
};

export default nextConfig;
