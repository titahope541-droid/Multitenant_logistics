/**
 * Health & readiness service — liveness never depends on MongoDB uptime;
 * readiness degrades truthfully; probes are dependency-safe and leak-free.
 */

import { afterEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { checkDatabase, getHealthReport } from "@/server/services/health.service";
import { resetServerConfigCacheForTests } from "@/server/config/env";

const ORIGINAL_URI = process.env.MONGODB_URI;

function setUri(value: string | undefined): void {
  if (value === undefined) delete process.env.MONGODB_URI;
  else process.env.MONGODB_URI = value;
  resetServerConfigCacheForTests();
}

afterEach(async () => {
  setUri(ORIGINAL_URI);
  await mongoose.disconnect().catch(() => undefined);
});

describe("checkDatabase", () => {
  it("reports `down` cleanly when MONGODB_URI is missing (never throws)", async () => {
    setUri(undefined);
    const check = await checkDatabase();
    expect(check.status).toBe("down");
    expect(check.latencyMs).toBeNull();
  });

  it("reports `down` cleanly when MongoDB is unreachable (never throws)", async () => {
    setUri("mongodb://127.0.0.1:29998/definitely-not-running");
    const check = await checkDatabase();
    expect(check.status).toBe("down");
    expect(check.latencyMs).toBeNull();
  });

  it("reports `up` with latency when MongoDB is reachable", async () => {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const server = await MongoMemoryServer.create();
    try {
      setUri(server.getUri("meridian_health_test"));
      const check = await checkDatabase();
      expect(check.status).toBe("up");
      expect(typeof check.latencyMs).toBe("number");
    } finally {
      await server.stop();
    }
  });
});

describe("getHealthReport payload integrity", () => {
  it("returns the documented public-safe shape and never leaks URI/secret material", async () => {
    const report = await getHealthReport();
    expect(report.service).toBe("meridian-api");
    expect(["up", "down"]).toContain(report.checks.database.status);
    expect(typeof report.uptimeSeconds).toBe("number");
    expect(report.timestamp.endsWith("Z")).toBe(true);
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("mongodb://");
    expect(serialized).not.toContain("SESSION_SECRET");
    expect(serialized).not.toContain(process.env.SESSION_SECRET ?? "__never__");
  });
});
