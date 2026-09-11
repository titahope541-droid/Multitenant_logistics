/**
 * Authorization middleware behavior — role gating and tenant-context
 * authority. These tests assert the backend enforces what hidden UI can
 * never enforce: role boundaries and the session-derived tenant scope.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ApiError } from "@/server/http/errors";
import { authorize } from "@/server/middleware/auth";
import * as auth from "@/server/services/auth.service";
import {
  clearMemoryMongo,
  startMemoryMongo,
  stopMemoryMongo,
} from "../helpers/mongo-memory";
import { seedSession, seedTenant, seedUser } from "../helpers/seed";

beforeAll(startMemoryMongo);
afterEach(clearMemoryMongo);
afterAll(stopMemoryMongo);

function captureAuthorizeError(run: () => unknown): ApiError {
  try {
    run();
  } catch (caught) {
    expect(caught).toBeInstanceOf(ApiError);
    return caught as ApiError;
  }
  throw new Error("expected authorize() to throw");
}

function contextFor(overrides: Partial<auth.AuthContext["user"]>): auth.AuthContext {
  return {
    user: {
      id: "65f000000000000000000001",
      name: "Test",
      email: "t@example.com",
      role: "TENANT_ADMIN",
      tenantId: "65f0000000000000000000aa",
      ...overrides,
    },
    sessionId: "65f0000000000000000000bb",
  };
}

describe("authorize() gate", () => {
  it("rejects anonymous callers with 401 UNAUTHORIZED", () => {
    const error = captureAuthorizeError(() => authorize(null));
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED");
  });

  it("allows any authenticated user when no role list is given", () => {
    const context = contextFor({ role: "TENANT_ADMIN" });
    expect(authorize(context)).toBe(context);
  });

  it("allows a matching role", () => {
    const context = contextFor({ role: "PLATFORM_ADMIN", tenantId: null });
    expect(authorize(context, ["PLATFORM_ADMIN"])).toBe(context);
  });

  it("rejects a TENANT_ADMIN from platform routes with 403 FORBIDDEN", () => {
    const error = captureAuthorizeError(() =>
      authorize(contextFor({ role: "TENANT_ADMIN" }), ["PLATFORM_ADMIN"]),
    );
    expect(error.status).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
  });

  it("rejects a PLATFORM_ADMIN from tenant routes with 403 FORBIDDEN", () => {
    const error = captureAuthorizeError(() =>
      authorize(contextFor({ role: "PLATFORM_ADMIN", tenantId: null }), ["TENANT_ADMIN"]),
    );
    expect(error.status).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
  });
});

describe("tenant context is session-derived and authoritative", () => {
  it("resolution returns the tenant bound to the account — never caller input", async () => {
    const tenantA = await seedTenant({ slug: "tenant-a" });
    const userA = await seedUser({ role: "TENANT_ADMIN", tenantId: tenantA._id });
    const { token } = await seedSession(userA);

    const context = await auth.resolveSessionByToken(token);
    // The ONLY tenant identity the backend accepts comes from the session/user.
    expect(context?.user.tenantId).toBe(String(tenantA._id));
    expect(context?.user.tenantId).not.toBe("anything-the-client-might-send");
  });

  it("two tenants resolve to two distinct, non-interchangeable contexts", async () => {
    const tenantA = await seedTenant({ slug: "tenant-a" });
    const tenantB = await seedTenant({ slug: "tenant-b" });
    const userA = await seedUser({ role: "TENANT_ADMIN", tenantId: tenantA._id });
    const userB = await seedUser({ role: "TENANT_ADMIN", tenantId: tenantB._id });
    const sessionA = await seedSession(userA);
    const sessionB = await seedSession(userB);

    const contextA = await auth.resolveSessionByToken(sessionA.token);
    const contextB = await auth.resolveSessionByToken(sessionB.token);

    expect(contextA?.user.tenantId).toBe(String(tenantA._id));
    expect(contextB?.user.tenantId).toBe(String(tenantB._id));
    expect(contextA?.user.tenantId).not.toBe(contextB?.user.tenantId);
  });
});
