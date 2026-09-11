import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Test configuration. Auth tests run against a REAL MongoDB protocol via
 * mongodb-memory-server (in-memory mongod) — security behavior is tested
 * against the actual ODM, not mocks.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    setupFiles: ["tests/setup.ts"],
    env: { LOG_LEVEL: "fatal" },
    server: { deps: { external: [/argon2/] } },
  },
});
