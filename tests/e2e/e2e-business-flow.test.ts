/**
 * E2E business flow (service-level, real MongoDB replica set) — the
 * platform's most important path exercised end-to-end through the SAME
 * services the HTTP routes call:
 *
 *   platform admin provisions tenant
 *     → tenant admin signs in (login)
 *     → creates a package (tracking ID minted)
 *     → customer tracks it publicly (REST)
 *     → admin changes status + location (with realtime broadcasts wired)
 *     → customer sees the change
 *     → package archived → public 404 identical to unknown IDs
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import * as auth from "@/server/services/auth.service";
import * as packageService from "@/server/services/package.service";
import * as tenantService from "@/server/services/tenant.service";
import * as publicTracking from "@/server/services/public-tracking.service";
import { authorizeTrackingSubscription } from "@/server/realtime/subscription.service";
import { getPublicWebsiteData } from "@/server/services/website.service";
import {
  clearMemoryMongo,
  startMemoryReplSet,
  stopMemoryMongo,
} from "../helpers/mongo-memory";
import type { HydratedDocument } from "mongoose";
import type { UserDocument } from "@/db/models/user.model";
import type { TenantStatus } from "@/types/domain";
import type { AuthContext } from "@/server/services/auth.service";

beforeAll(startMemoryReplSet);
afterEach(clearMemoryMongo);
afterAll(stopMemoryMongo);

const creation = {
  companyName: "E2E Freight",
  slug: "e2e-freight",
  contact: { email: "ops@e2e.test", phone: "+234 800" },
  admin: { name: "E2E Ops", email: "admin@e2e.test" },
};

interface ResolvedTenantStub {
  id: string;
  companyName: string;
  slug: string;
  status: TenantStatus;
  contact: { phone?: string; email?: string; address?: string };
}

function resolvedForE2E(tenantId: string, status: TenantStatus = "ACTIVE"): ResolvedTenantStub {
  return { id: tenantId, companyName: "E2E Freight", slug: "e2e-freight", status, contact: creation.contact };
}

function authContextFor(user: HydratedDocument<UserDocument>, tenantId: string): AuthContext {
  return {
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: "TENANT_ADMIN",
      tenantId,
    },
    sessionId: "e2e-session",
  };
}

describe("E2E: provision → login → package → public track → live-ish mutation → archive", () => {
  it("completes the full platform path with isolation semantics at every hop", async () => {
    // 1) PLATFORM ADMIN provisions tenant + one admin + website config (atomic)
    const tenant = await tenantService.createTenantWithAdmin(creation);
    expect(tenant.tenant.slug).toBe("e2e-freight");
    expect(tenant.temporaryPassword).toBeDefined();

    // 2) TENANT ADMIN logs in with the one-time password (Phase 3 flow)
    const login = await auth.login({ email: creation.admin.email, password: tenant.temporaryPassword! });
    expect(login.user.role).toBe("TENANT_ADMIN");
    expect(login.user.tenantId).toBe(tenant.tenant.id);
    const { UserModel } = await import("@/db/models/user.model");
    const adminDoc = (await UserModel.findById(login.user.id))!;
    const tenantAuth = authContextFor(adminDoc, tenant.tenant.id);

    // 3) create a package — server mints the tracking ID, PENDING lands as event #1
    const created = await packageService.createPackage(tenantAuth, {
      packageName: "E2E crate",
      sender: { name: "Sender", phone: "08001111111", address: "Origin" },
      receiver: { name: "Receiver", phone: "08002222222", address: "Destination" },
      delivery: { estimatedDeliveryDate: new Date("2026-10-10") },
    });
    expect(created.trackingId).toMatch(/^PKG-E2E-/);
    expect(created.package.statusHistory.map((e) => e.status)).toEqual(["PENDING"]);

    // 4) PUBLIC customer finds it on the tenant host context (REST first)
    const first = await publicTracking.getPublicTracking(resolvedForE2E(tenant.tenant.id), created.trackingId);
    expect(first.status).toBe("PENDING");
    expect(first.timeline).toHaveLength(1);
    expect(JSON.stringify(first)).not.toContain("08001111111"); // privacy at boundary

    // 5) subscription authorization would let the socket join (realtime flow)
    await expect(
      authorizeTrackingSubscription(resolvedForE2E(tenant.tenant.id), created.trackingId),
    ).resolves.toBeTruthy();

    // 6) admin updates status (twice incl. post-facility IN_TRANSIT) + location
    await packageService.changeStatus(tenantAuth, created.package.id, { status: "IN_TRANSIT", note: "left origin" });
    await packageService.changeStatus(tenantAuth, created.package.id, { status: "ARRIVED_AT_FACILITY", note: "hub" });
    await packageService.changeStatus(tenantAuth, created.package.id, { status: "IN_TRANSIT", note: "final leg" });
    const located = await packageService.updateLocation(tenantAuth, created.package.id, {
      latitude: 6.52,
      longitude: 3.37,
      locationName: "Lagos Transshipment",
    });

    // 7) public customer sees every change without refresh (state from the DB)
    const after = await publicTracking.getPublicTracking(resolvedForE2E(tenant.tenant.id), created.trackingId);
    expect(after.status).toBe("IN_TRANSIT");
    expect(after.timeline.map((event) => event.status)).toEqual([
      "PENDING",
      "IN_TRANSIT",
      "ARRIVED_AT_FACILITY",
      "IN_TRANSIT",
    ]);
    expect(after.timeline[2]!.note).toBe("hub");
    expect(after.currentLocation?.locationName).toBe("Lagos Transshipment");
    expect(located.locationHistory.length).toBe(1);

    // 8) website renders off the config the platform admin initialized
    const website = await getPublicWebsiteData(resolvedForE2E(tenant.tenant.id));
    expect(website.companyName).toBe("E2E Freight");

    // 9) archiving conceals publicly — public 404 identical to "never existed"
    await packageService.setPackageArchived(tenantAuth, created.package.id, true);
    await expect(
      publicTracking.getPublicTracking(resolvedForE2E(tenant.tenant.id), created.trackingId),
    ).rejects.toMatchObject({ code: "PACKAGE_NOT_FOUND", status: 404 });
    await expect(
      authorizeTrackingSubscription(resolvedForE2E(tenant.tenant.id), created.trackingId),
    ).rejects.toMatchObject({ code: "PACKAGE_NOT_FOUND" });

    // 10) suspension freezes the public door; platform admin keeps control
    await tenantService.transitionTenant(tenant.tenant.id, "suspend");
    await expect(
      publicTracking.getPublicTracking(resolvedForE2E(tenant.tenant.id, "SUSPENDED"), created.trackingId),
    ).rejects.toMatchObject({ code: "TENANT_SUSPENDED" });
    await expect(
      auth.login({ email: creation.admin.email, password: tenant.temporaryPassword!.slice(0) }),
    ).rejects.toBeInstanceOf((await import("@/server/http/errors")).ApiError);

    // restore: status-only, data intact — and un-archiving the package
    // makes it publicly trackable again with history preserved
    await tenantService.transitionTenant(tenant.tenant.id, "restore");
    await packageService.setPackageArchived(tenantAuth, created.package.id, false);
    const restored = await publicTracking.getPublicTracking(resolvedForE2E(tenant.tenant.id), created.trackingId);
    expect(restored.status).toBe("IN_TRANSIT");
    expect(restored.timeline).toHaveLength(4);
  });
});
