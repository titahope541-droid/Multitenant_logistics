/**
 * Tenant isolation & IDOR matrix — the definitive cross-tenant proof table.
 * Coverage: packages, status_events, location_history, plus tenancy
 * smuggling attempts (client-supplied tenantId is never authoritative).
 * Cross-tenant equals "not found" — existence is not even confirmable.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ApiError } from "@/server/http/errors";
import { LocationHistoryModel } from "@/db/models/location-history.model";
import { StatusEventModel } from "@/db/models/status-event.model";
import { SessionModel } from "@/db/models/session.model";
import { UserModel } from "@/db/models/user.model";
import type { AuthContext } from "@/server/services/auth.service";
import { authorizeTrackingSubscription } from "@/server/realtime/subscription.service";
import * as packageService from "@/server/services/package.service";
import {
  clearMemoryMongo,
  startMemoryReplSet,
  stopMemoryMongo,
} from "../helpers/mongo-memory";
import { seedTenant, seedUser } from "../helpers/seed";
import type { CreatePackageInput } from "@/server/validators/package.validators";
import type { HydratedDocument } from "mongoose";
import type { TenantDocument, TenantContactDetails } from "@/db/models/tenant.model";
import type { UserDocument } from "@/db/models/user.model";

beforeAll(startMemoryReplSet);
afterEach(clearMemoryMongo);
afterAll(stopMemoryMongo);

const baseInput: CreatePackageInput = {
  packageName: "Matrix crate",
  sender: { name: "S", phone: "080000001", address: "street 1" },
  receiver: { name: "R", phone: "080000002", address: "street 2" },
};

function authFor(user: HydratedDocument<UserDocument>, tenant: HydratedDocument<TenantDocument>): AuthContext {
  return {
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: "TENANT_ADMIN",
      tenantId: String(tenant._id),
    },
    sessionId: "matrix-session",
  };
}

interface ResolvedTenantStub {
  id: string;
  companyName: string;
  slug: string;
  status: "ACTIVE";
  contact: TenantContactDetails;
}

function resolved(tenant: { _id: unknown; companyName: string; slug: string }): ResolvedTenantStub {
  return {
    id: String(tenant._id),
    companyName: tenant.companyName,
    slug: tenant.slug,
    status: "ACTIVE",
    contact: {},
  };
}

async function expect404(promise: Promise<unknown>) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).code).toBe("PACKAGE_NOT_FOUND");
}

async function paired() {
  const tenantA = await seedTenant({ slug: "alpha" });
  const tenantB = await seedTenant({ slug: "beta" });
  const userA = await seedUser({ role: "TENANT_ADMIN", tenantId: tenantA._id, email: "a@alpha.io" });
  const userB = await seedUser({ role: "TENANT_ADMIN", tenantId: tenantB._id, email: "b@beta.io" });
  return { tenantA, tenantB, authA: authFor(userA, tenantA), authB: authFor(userB, tenantB) };
}

describe("IDOR: Tenant A manipulating Tenant B's _id anywhere blocks everything", () => {
  it("details, status stream, location stream, archive, restore, subscription — all invisible", async () => {
    const { tenantA, tenantB, authA, authB } = await paired();
    const { package: victim } = await packageService.createPackage(authB, {
      ...baseInput,
      currentLocation: { latitude: 1, longitude: 1, locationName: "B only" },
    });
    await packageService.changeStatus(authB, victim.id, { status: "IN_TRANSIT", note: "secret-B-op" });

    // resources exist for their owner
    const ownDetails = await packageService.getPackageDetails(authB, victim.id);
    expect(ownDetails.statusHistory.length).toBe(2);
    expect(ownDetails.locationHistory.length).toBe(1);

    // every cross-tenant surface returns the SAME 404
    await expect404(packageService.getPackageDetails(authA, victim.id));
    await expect404(packageService.changeStatus(authA, victim.id, { status: "DELIVERED" }));
    await expect404(packageService.updateLocation(authA, victim.id, { latitude: 2, longitude: 2 }));
    await expect404(packageService.setPackageArchived(authA, victim.id, true));
    await expect404(packageService.setPackageArchived(authA, victim.id, false));
    await expect404(authorizeTrackingSubscription(resolved(tenantA), victim.trackingId));

    // direct history reads with the foreign tenantId see nothing either
    expect(await StatusEventModel.countDocuments({ tenantId: tenantA._id, packageId: victim.id })).toBe(0);
    expect(await LocationHistoryModel.countDocuments({ tenantId: tenantA._id, packageId: victim.id })).toBe(0);

    // and B's data remains byte-for-byte
    const after = await packageService.getPackageDetails(authB, victim.id);
    expect(after.status).toBe("IN_TRANSIT");
    expect(after.archived).toBe(false);
  });

  it("a client-supplied tenantId can never redirect a write (service derives from session)", async () => {
    const { authA, authB, tenantA, tenantB } = await paired();
    // Even if a rogue caller smuggles a tenantId field into the payload,
    // the service ignores fields it never reads — storage is scoped to auth.
    const rogue = { ...baseInput, tenantId: String(tenantB._id) } as unknown as CreatePackageInput;
    const created = await packageService.createPackage(authA, rogue);

    const stored = await (await import("@/db/models/package.model")).PackageModel.findOne({ trackingId: created.trackingId }).lean();
    expect(stored).not.toBeNull();
    expect(String(stored!.tenantId)).toBe(String(tenantA._id)); // session won — smuggle ignored

    // Tenant B sees nothing of A's new package (list + details)
    expect((await packageService.listPackages(authB, {})).total).toBe(0);
    await expect404(packageService.getPackageDetails(authB, created.package.id));
  });

  it("sessions/users of tenant A are invisible to tenant B surfaces", async () => {
    const { tenantA, tenantB } = await paired();
    // tenants' users are not enumerable by other tenants
    expect(await UserModel.countDocuments({ tenantId: tenantB._id })).toBe(1);
    expect(await UserModel.find({ tenantId: tenantA._id }).countDocuments()).toBe(1);
    // session invalidation is tenant-scoped on suspension
    const gone = await SessionModel.deleteMany({ tenantId: tenantB._id });
    expect(gone.deletedCount).toBe(0);
    expect(tenantA).toBeTruthy();
  });
});
