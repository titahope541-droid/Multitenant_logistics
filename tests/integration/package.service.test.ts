/**
 * Package service — behavior tests against a real single-node replica set.
 * Covers creation + tracking IDs, the five-status workflows, location
 * history, soft archiving, transaction consistency, and the mandatory
 * cross-tenant isolation matrix.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/http/errors";
import type { AuthContext } from "@/server/services/auth.service";
import { LocationHistoryModel } from "@/db/models/location-history.model";
import { PackageModel } from "@/db/models/package.model";
import { StatusEventModel } from "@/db/models/status-event.model";
import { TenantModel, type TenantDocument } from "@/db/models/tenant.model";
import { UserModel, type UserDocument } from "@/db/models/user.model";
import * as packageService from "@/server/services/package.service";
import * as trackingIds from "@/server/services/tracking-id.service";
import {
  clearMemoryMongo,
  startMemoryReplSet,
  stopMemoryMongo,
} from "../helpers/mongo-memory";
import { seedTenant, seedUser } from "../helpers/seed";
import type { CreatePackageInput } from "@/server/validators/package.validators";
import type { HydratedDocument } from "mongoose";

beforeAll(startMemoryReplSet);
afterEach(clearMemoryMongo);
afterAll(stopMemoryMongo);

function authFor(
  user: HydratedDocument<UserDocument>,
  tenant: HydratedDocument<TenantDocument>,
): AuthContext {
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
  packageName: "Documents — Lagos to Abuja",
  description: "Office documents, 2 folders",
  sender: { name: "Ada", phone: "0801", email: "ada@x.io", address: "Lagos" },
  receiver: { name: "Femi", phone: "0802", address: "Abuja" },
  specifications: { size: "A4 envelope", weight: 0.6 },
  payment: { paymentMethod: "Cash on Delivery", paymentStatus: "UNPAID", shippingCost: 2500 },
  delivery: { estimatedDeliveryDate: new Date("2026-10-01") },
};

async function expectApiError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(status);
  expect((error as ApiError).code).toBe(code);
}

async function freshContext(slug = "swift") {
  const tenant = await seedTenant({ slug });
  const user = await seedUser({ role: "TENANT_ADMIN", tenantId: tenant._id, email: `ops@${slug}.io` });
  return { tenant, auth: authFor(user, tenant) };
}

describe("creation and tracking IDs", () => {
  it("creates a package with a generated tracking ID, PENDING status, and initial event", async () => {
    const { auth, tenant } = await freshContext();
    const result = await packageService.createPackage(auth, baseInput);

    expect(result.trackingId).toMatch(/^PKG-SWI-\d{8}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    expect(result.package.status).toBe("PENDING");
    expect(result.package.trackingId).toBe(result.trackingId);
    expect(result.package.payment.paymentMethod).toBe("Cash on Delivery"); // free text survives
    expect(result.package.statusHistory).toHaveLength(1);
    expect(result.package.statusHistory[0]!.status).toBe("PENDING");

    const stored = await PackageModel.findOne({ trackingId: result.trackingId });
    expect(String(stored!.tenantId)).toBe(String(tenant._id)); // derived, never client-supplied
    expect(JSON.stringify(result)).not.toContain("passwordHash");
  });

  it("records an initial location as currentLocation + first history row", async () => {
    const { auth } = await freshContext();
    const result = await packageService.createPackage(auth, {
      ...baseInput,
      currentLocation: { latitude: 6.5244, longitude: 3.3792, locationName: "Lagos origin hub" },
    });
    expect(result.package.currentLocation?.locationName).toBe("Lagos origin hub");
    expect(result.package.locationHistory).toHaveLength(1);
  });

  it("mints globally unique IDs and retries safely on collision", async () => {
    const { auth, tenant } = await freshContext();
    await PackageModel.create({
      tenantId: tenant._id,
      trackingId: "PKG-SWI-20260909-DUPX99",
      packageName: "Duplicate holder",
      sender: { name: "S", phone: "1", address: "a" },
      receiver: { name: "R", phone: "2", address: "b" },
    });

    const spy = vi.spyOn(trackingIds, "generateTrackingId");
    spy.mockReturnValueOnce("PKG-SWI-20260909-DUPX99"); // forced collision
    const result = await packageService.createPackage(auth, baseInput);
    expect(result.trackingId).not.toBe("PKG-SWI-20260909-DUPX99");
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2);
    spy.mockRestore();
  });

  it("rolls creation back completely when the initial status event fails", async () => {
    const { auth } = await freshContext();
    const spy = vi
      .spyOn(StatusEventModel, "create")
      .mockRejectedValueOnce(new Error("simulated status-event failure"));

    await expect(packageService.createPackage(auth, baseInput)).rejects.toThrow(
      "simulated status-event failure",
    );
    expect(await PackageModel.countDocuments({})).toBe(0);
    expect(await StatusEventModel.countDocuments({})).toBe(0);
    spy.mockRestore();
  });

  it("fails closed when the tenant itself is gone", async () => {
    const { auth, tenant } = await freshContext();
    await TenantModel.deleteOne({ _id: tenant._id });
    await expectApiError(packageService.createPackage(auth, baseInput), 403, "TENANT_SUSPENDED");
  });
});

describe("status workflow", () => {
  it("walks the full lifecycle incl. repeated IN_TRANSIT and records every event", async () => {
    const { auth } = await freshContext();
    const { package: created } = await packageService.createPackage(auth, baseInput);

    for (const [status, note] of [
      ["PROCESSED", "sorted"],
      ["IN_TRANSIT", "left Lagos"],
      ["ARRIVED_AT_FACILITY", "Abuja facility"],
      ["IN_TRANSIT", "final leg"],
      ["DELIVERED", "signed for"],
    ] as const) {
      await packageService.changeStatus(auth, created.id, { status, note });
    }

    const details = await packageService.getPackageDetails(auth, created.id);
    expect(details.status).toBe("DELIVERED");
    expect(details.statusHistory.map((event) => event.status)).toEqual([
      "PENDING",
      "PROCESSED",
      "IN_TRANSIT",
      "ARRIVED_AT_FACILITY",
      "IN_TRANSIT",
      "DELIVERED",
    ]);
    expect(details.statusHistory[3]!.note).toBe("Abuja facility");
  });

  it("allows a direct admin override PENDING → DELIVERED and keeps history intact", async () => {
    const { auth } = await freshContext();
    const { package: created } = await packageService.createPackage(auth, baseInput);
    await packageService.changeStatus(auth, created.id, { status: "DELIVERED" });
    const details = await packageService.getPackageDetails(auth, created.id);
    expect(details.status).toBe("DELIVERED");
    expect(details.statusHistory.map((event) => event.status)).toEqual(["PENDING", "DELIVERED"]);
  });

  it("rejects a garbage status defensively", async () => {
    const { auth } = await freshContext();
    const { package: created } = await packageService.createPackage(auth, baseInput);
    await expectApiError(
      packageService.changeStatus(auth, created.id, { status: "OUT_FOR_DELIVERY" as never }),
      400,
      "INVALID_PACKAGE_STATUS",
    );
  });

  it("rejects status changes on archived packages", async () => {
    const { auth } = await freshContext();
    const { package: created } = await packageService.createPackage(auth, baseInput);
    await packageService.setPackageArchived(auth, created.id, true);
    await expectApiError(
      packageService.changeStatus(auth, created.id, { status: "PROCESSED" }),
      400,
      "PACKAGE_ARCHIVED",
    );
  });

  it("keeps the package state consistent when the status event write fails", async () => {
    const { auth } = await freshContext();
    const { package: created } = await packageService.createPackage(auth, baseInput);
    const spy = vi
      .spyOn(StatusEventModel, "create")
      .mockRejectedValueOnce(new Error("simulated event failure"));

    await expect(
      packageService.changeStatus(auth, created.id, { status: "PROCESSED" }),
    ).rejects.toThrow("simulated event failure");

    const after = await PackageModel.findById(created.id);
    expect(after!.status).toBe("PENDING"); // rolled back, not half-updated
    expect(await StatusEventModel.countDocuments({ packageId: created.id })).toBe(1); // only initial
    spy.mockRestore();
  });
});

describe("location workflow", () => {
  it("updates currentLocation and appends history without erasing the past", async () => {
    const { auth } = await freshContext();
    const { package: created } = await packageService.createPackage(auth, {
      ...baseInput,
      currentLocation: { latitude: 6.5, longitude: 3.3, locationName: "Origin" },
    });

    const updated = await packageService.updateLocation(auth, created.id, {
      latitude: 7.3775,
      longitude: 3.947,
      locationName: "Ibadan waypoint",
    });
    expect(updated.currentLocation?.locationName).toBe("Ibadan waypoint");
    expect(updated.locationHistory.length).toBe(2);
    expect(updated.locationHistory.map((row) => row.locationName)).toEqual([
      "Ibadan waypoint",
      "Origin",
    ]);
  });

  it("rejects out-of-range coordinates defensively", async () => {
    const { auth } = await freshContext();
    const { package: created } = await packageService.createPackage(auth, baseInput);
    await expectApiError(
      packageService.updateLocation(auth, created.id, { latitude: 91, longitude: 3 }),
      400,
      "INVALID_LOCATION",
    );
  });

  it("keeps currentLocation consistent when the history write fails", async () => {
    const { auth } = await freshContext();
    const { package: created } = await packageService.createPackage(auth, baseInput);
    const spy = vi
      .spyOn(LocationHistoryModel, "create")
      .mockRejectedValueOnce(new Error("simulated history failure"));

    await expect(
      packageService.updateLocation(auth, created.id, { latitude: 5, longitude: 5 }),
    ).rejects.toThrow("simulated history failure");

    const after = await PackageModel.findById(created.id);
    expect(after!.currentLocation?.latitude).toBeUndefined(); // rolled back
    spy.mockRestore();
  });
});

describe("archive / restore", () => {
  it("hides archived packages from the normal list, shows them in the archive drawer", async () => {
    const { auth } = await freshContext();
    const { package: created } = await packageService.createPackage(auth, baseInput);
    await packageService.setPackageArchived(auth, created.id, true);

    const normal = await packageService.listPackages(auth, {});
    expect(normal.total).toBe(0);
    const drawer = await packageService.listPackages(auth, { archived: true });
    expect(drawer.total).toBe(1);
    expect(drawer.items[0]!.archived).toBe(true);
  });

  it("restores without touching tracking ID or history", async () => {
    const { auth } = await freshContext();
    const { package: created } = await packageService.createPackage(auth, baseInput);
    await packageService.changeStatus(auth, created.id, { status: "IN_TRANSIT" });
    await packageService.updateLocation(auth, created.id, { latitude: 1, longitude: 1 });
    await packageService.setPackageArchived(auth, created.id, true);
    const restored = await packageService.setPackageArchived(auth, created.id, false);

    expect(restored.archived).toBe(false);
    expect(restored.trackingId).toBe(created.trackingId);
    expect(restored.statusHistory.length).toBe(2);
    expect(restored.locationHistory.length).toBe(1);
    expect(restored.status).toBe("IN_TRANSIT");
  });
});

describe("list querying", () => {
  it("searches tracking ID, package name, receiver and sender", async () => {
    const { auth } = await freshContext();
    const { trackingId, package: created } = await packageService.createPackage(auth, baseInput);
    for (const term of [trackingId.slice(0, 8), "Documents", "Femi", "Ada"]) {
      const result = await packageService.listPackages(auth, { search: term });
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.items.some((item) => item.id === created.id)).toBe(true);
    }
    expect((await packageService.listPackages(auth, { search: "zzz-nothing" })).total).toBe(0);
  });

  it("filters by an exact status and paginates with meta", async () => {
    const { auth } = await freshContext();
    await packageService.createPackage(auth, baseInput);
    await packageService.createPackage(auth, { ...baseInput, packageName: "Second" });
    const { package: third } = await packageService.createPackage(auth, { ...baseInput, packageName: "Third" });
    await packageService.changeStatus(auth, third.id, { status: "DELIVERED" });

    const delivered = await packageService.listPackages(auth, { status: "DELIVERED" });
    expect(delivered.total).toBe(1);

    const pageOne = await packageService.listPackages(auth, { page: 1, limit: 2 });
    expect(pageOne.items.length).toBe(2);
    expect(pageOne.total).toBe(3);
    expect(pageOne.totalPages).toBe(2);
    expect((await packageService.listPackages(auth, { page: 2, limit: 2 })).items.length).toBe(1);
    expect((await packageService.listPackages(auth, { limit: 999 })).limit).toBeLessThanOrEqual(50);
  });
});

describe("MANDATORY cross-tenant isolation", () => {
  it("Tenant A cannot read, mutate, or archive Tenant B's package — in any way", async () => {
    const a = await freshContext("alpha");
    const b = await freshContext("beta");
    const { package: victim } = await packageService.createPackage(b.auth, baseInput);

    // A's list is scoped to A only
    const listA = await packageService.listPackages(a.auth, {});
    expect(listA.items.some((item) => item.trackingId === victim.trackingId)).toBe(false);

    await expectApiError(packageService.getPackageDetails(a.auth, victim.id), 404, "PACKAGE_NOT_FOUND");
    await expectApiError(
      packageService.changeStatus(a.auth, victim.id, { status: "DELIVERED" }),
      404,
      "PACKAGE_NOT_FOUND",
    );
    await expectApiError(
      packageService.updateLocation(a.auth, victim.id, { latitude: 1, longitude: 1 }),
      404,
      "PACKAGE_NOT_FOUND",
    );
    await expectApiError(packageService.setPackageArchived(a.auth, victim.id, true), 404, "PACKAGE_NOT_FOUND");
    await expectApiError(packageService.setPackageArchived(a.auth, victim.id, false), 404, "PACKAGE_NOT_FOUND");

    // and the victim is untouched
    const untouched = await packageService.getPackageDetails(b.auth, victim.id);
    expect(untouched.status).toBe("PENDING");
    expect(untouched.archived).toBe(false);
  });

  it("Tenant B likewise cannot see Tenant A's package in any listing", async () => {
    const a = await freshContext("gamma");
    const b = await freshContext("delta");
    await packageService.createPackage(a.auth, baseInput);
    const listB = await packageService.listPackages(b.auth, {});
    expect(listB.total).toBe(0);
  });
});
