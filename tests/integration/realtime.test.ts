/**
 * Realtime tests — subscription authorization and the DB-first broadcast
 * guarantee. The Socket.IO server is faked at the registry boundary; the
 * database is real (single-node replica set for transactional flows).
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/http/errors";
import { LocationHistoryModel } from "@/db/models/location-history.model";
import { PackageModel } from "@/db/models/package.model";
import { StatusEventModel } from "@/db/models/status-event.model";
import type { AuthContext } from "@/server/services/auth.service";
import { authorizeTrackingSubscription } from "@/server/realtime/subscription.service";
import { REALTIME_EVENTS, tenantRoom, trackingRoom } from "@/types/realtime";
import * as packageService from "@/server/services/package.service";
import {
  clearMemoryMongo,
  startMemoryReplSet,
  stopMemoryMongo,
} from "../helpers/mongo-memory";
import { seedTenant, seedUser } from "../helpers/seed";
import type { HydratedDocument } from "mongoose";
import type { TenantDocument, TenantContactDetails } from "@/db/models/tenant.model";
import type { UserDocument } from "@/db/models/user.model";
import type { TenantStatus } from "@/types/domain";
import type { CreatePackageInput } from "@/server/validators/package.validators";

beforeAll(startMemoryReplSet);
afterEach(clearMemoryMongo);
afterAll(stopMemoryMongo);

interface ResolvedTenantStub {
  id: string;
  companyName: string;
  slug: string;
  status: TenantStatus;
  contact: TenantContactDetails;
}

function resolved(doc: HydratedDocument<TenantDocument>, status?: TenantStatus): ResolvedTenantStub {
  return {
    id: String(doc._id),
    companyName: doc.companyName,
    slug: doc.slug,
    status: status ?? doc.status,
    contact: doc.contact ?? {},
  };
}

function authFor(user: HydratedDocument<UserDocument>, tenant: HydratedDocument<TenantDocument>): AuthContext {
  return {
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: "TENANT_ADMIN",
      tenantId: String(tenant._id),
    },
    sessionId: "test-session",
  };
}

const baseInput: CreatePackageInput = {
  packageName: "Live Crate",
  sender: { name: "S", phone: "0800SECRET", email: "secret@example.com", address: "hidden" },
  receiver: { name: "R", phone: "2", address: "b" },
};

async function expectApiError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(status);
  expect((error as ApiError).code).toBe(code);
}

describe("subscription authorization (room security)", () => {
  it("authorizes a valid public tracking subscription", async () => {
    const other = await freshPair();
    expect(other).toBeTruthy();
  });

  it("rejects unknown, archived, suspended, archived-tenant, and cross-tenant subscriptions", async () => {
    const tenantA = await seedTenant({ slug: "alpha" });
    const tenantB = await seedTenant({ slug: "beta" });
    const userB = await seedUser({ role: "TENANT_ADMIN", tenantId: tenantB._id, email: "ops@beta.io" });
    const { package: victim } = await packageService.createPackage(authFor(userB, tenantB), baseInput);

    // valid on B
    const authorized = await authorizeTrackingSubscription(resolved(tenantB), victim.trackingId);
    expect(String(authorized._id)).toBe(victim.id);

    // unknown id
    await expectApiError(
      authorizeTrackingSubscription(resolved(tenantB), "PKG-NOPE-00000000-ZZZZ99"),
      404,
      "PACKAGE_NOT_FOUND",
    );

    // knowing the MongoDB _id grants nothing
    await expectApiError(
      authorizeTrackingSubscription(resolved(tenantB), victim.id),
      404,
      "PACKAGE_NOT_FOUND",
    );

    // cross-tenant: A cannot subscribe to B's package (mandatory isolation)
    await expectApiError(
      authorizeTrackingSubscription(resolved(tenantA), victim.trackingId),
      404,
      "PACKAGE_NOT_FOUND",
    );

    // archived package is invisible to subscriptions
    await packageService.setPackageArchived(authFor(userB, tenantB), victim.id, true);
    await expectApiError(
      authorizeTrackingSubscription(resolved(tenantB), victim.trackingId),
      404,
      "PACKAGE_NOT_FOUND",
    );

    // suspended tenant → blocked; archived tenant → blocked
    await expectApiError(
      authorizeTrackingSubscription(resolved(tenantB, "SUSPENDED"), victim.trackingId),
      403,
      "TENANT_SUSPENDED",
    );
    await expectApiError(
      authorizeTrackingSubscription(resolved(tenantB, "ARCHIVED"), victim.trackingId),
      403,
      "TENANT_ARCHIVED",
    );
  });
});

/* ── DB-first broadcast guarantee ────────────────────────────────────────── */

interface CapturedEmit {
  room: string;
  event: string;
  payload: Record<string, unknown>;
}

function attachFakeIo(captured: CapturedEmit[]): void {
  const fake = {
    to(room: string) {
      return {
        emit(event: string, payload: Record<string, unknown>) {
          captured.push({ room, event, payload });
        },
      };
    },
  };
  (globalThis as Record<string, unknown>).__meridianSocketServer = fake;
}

function detachIo(): void {
  delete (globalThis as Record<string, unknown>).__meridianSocketServer;
}

async function freshPair(slug = "gamma") {
  const tenant = await seedTenant({ slug });
  const user = await seedUser({ role: "TENANT_ADMIN", tenantId: tenant._id, email: `ops@${slug}.io` });
  return { tenant, user, auth: authFor(user, tenant) };
}

describe("DB-first event emission", () => {
  afterEach(detachIo);

  it("status change emits to BOTH rooms — after commit — with public payload scrubbed", async () => {
    const { tenant, auth } = await freshPair();
    const { package: pkg } = await packageService.createPackage(auth, baseInput);
    const captured: CapturedEmit[] = [];
    attachFakeIo(captured);

    const updated = await packageService.changeStatus(auth, pkg.id, { status: "IN_TRANSIT", note: "rolling" });

    expect(captured).toHaveLength(2);
    const rooms = captured.map((entry) => entry.room);
    expect(rooms).toContain(trackingRoom(updated.trackingId));
    expect(rooms).toContain(tenantRoom(String(tenant._id)));

    const publicEmit = captured.find((entry) => entry.room.startsWith("tracking:"))!;
    expect(publicEmit.event).toBe(REALTIME_EVENTS.TRACKING_STATUS_UPDATED);
    const serialized = JSON.stringify(publicEmit.payload);
    expect(serialized).not.toContain("tenantId");
    expect(serialized).not.toContain("0800SECRET");
    expect(serialized).not.toContain("secret@example.com");

    // the database — not the broadcast — holds the truth
    expect(updated.status).toBe("IN_TRANSIT");
    expect(await StatusEventModel.countDocuments({ packageId: pkg.id })).toBe(2);
  });

  it("location change emits after history append; FAILED write emits NOTHING", async () => {
    const { auth } = await freshPair();
    const { package: pkg } = await packageService.createPackage(auth, baseInput);

    // 1) success path: history row exists, exactly two room emits follow
    const captured: CapturedEmit[] = [];
    attachFakeIo(captured);
    await packageService.updateLocation(auth, pkg.id, { latitude: 4.05, longitude: 9.76, locationName: "Douala" });
    expect(await LocationHistoryModel.countDocuments({ packageId: pkg.id })).toBe(1);
    expect(captured).toHaveLength(2);
    expect(captured.map((entry) => entry.room)).toContain(trackingRoom(pkg.trackingId));
    expect(captured[0]!.payload).toMatchObject({
      trackingId: pkg.trackingId,
      location: { latitude: 4.05, longitude: 9.76, locationName: "Douala" },
    });

    // 2) failure path: history write explodes → transaction rolls back → ZERO emits
    captured.length = 0;
    const spy = vi
      .spyOn(LocationHistoryModel, "create")
      .mockRejectedValueOnce(new Error("simulated history failure"));
    await expect(
      packageService.updateLocation(auth, pkg.id, { latitude: 5, longitude: 6 }),
    ).rejects.toThrow("simulated history failure");
    expect(captured).toHaveLength(0); // THE critical guarantee
    expect((await PackageModel.findById(pkg.id))!.currentLocation?.latitude).toBe(4.05);
    spy.mockRestore();
  });

  it("services still succeed when no socket server is attached (tests/scripts/dev-without-sockets)", async () => {
    detachIo();
    const { auth } = await freshPair();
    const { package: pkg } = await packageService.createPackage(auth, baseInput);
    await expect(packageService.changeStatus(auth, pkg.id, { status: "PROCESSED" })).resolves.toBeDefined();
  });
});
