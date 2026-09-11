/**
 * Test-suite guard — runs before ANY test file (vitest setupFiles).
 *
 * Production safety (docs/testing.md):
 *   1. Tests must NEVER run with NODE_ENV=production — a stray prod flag
 *      could turn a "quick test run" on the VPS into destructive work.
 *      Hard-stop the whole suite.
 *   2. Biological separation: integration tests only ever use
 *      mongodb-memory-server (helpers/mongo-memory.ts). `MONGODB_TEST_URI`
 *      exists solely as an opt-in escape hatch for debugging against a
 *      SCRATCH database — it must never be an Atlas/production-looking URI.
 */

import { beforeAll } from "vitest";

beforeAll(() => {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Test suite refuses to run with NODE_ENV=production. " +
        "Tests belong to CI/dev only — never against production. Docs: docs/testing.md.",
    );
  }

  const escapeHatch = process.env.MONGODB_TEST_URI;
  if (escapeHatch && !/localhost|127\.0\.0\.1|memory/i.test(escapeHatch)) {
    throw new Error(
      "MONGODB_TEST_URI points beyond localhost — refusing to start tests. " +
        "Tests use in-memory mongod by default; the URI hatch is scratch-DB only.",
    );
  }
});
