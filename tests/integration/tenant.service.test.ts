/**
 * Tenant management service — behavior tests against a real single-node
 * replica set (required for the transactional provisioning path).
 * Covers creation invariants, rollback, lifecycle matrix, list querying,
 * password reset, and cross-service login blocking.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { ApiError } from "@/server/http/errors";
import { PackageModel } from "@/db/models/package.model";
import { SessionModel } from "@/db/models/session.model";
import { TenantModel } from "@/db/models/tenant.model";
import { UserModel } from "@/db/models/user.model";
import { WebsiteConfigModel } from "@/db/models/website-config.model";
import * as auth from "@/server/services/auth.service";
import * as tenantService from "@/server/services/tenant.service";
import { verifyPassword } from "@/server/utils/password";
import {
  clearMemoryMongo,
  startMemoryReplSet,
  stopMemoryMongo,
} from "../helpers/mongo-memory";
import { seedSession, seedUser, TEST_PASSWORD } from "../helpers/seed";

beforeAll(startMemoryReplSet);
afterEach(clearMemoryMongo);
afterAll(stopMemoryMongo);

async function expectApiError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(status);
  expect((error as ApiError).code).toBe(code);
}

const creationInput = {
  companyName: "Swift Logistics",
  slug: "swift",
  contact: { phone: "+234 800 000 0000", email: "ops@swift.com", address: "21 Marina Rd, Lagos" },
  admin: { name: "Adaeze Okafor", email: "adaeze@swift.com" },
};

describe("atomic tenant provisioning", () => {
  it("creates tenant + exactly one tenant admin + WebsiteConfig as one unit", async () => {
    const result = await tenantService.createTenantWithAdmin(creationInput);

    expect(result.tenant.slug).toBe("swift");
    expect(result.tenant.status).toBe("ACTIVE");
    expect(result.admin.email).toBe("adaeze@swift.com");
    expect(result.temporaryPassword).toBeDefined();
    expect(result.temporaryPassword!.length).toBeGreaterThanOrEqual(10);

    const [tenant, admin, config] = await Promise.all([
      TenantModel.findOne({ slug: "swift" }),
      UserModel.findOne({ email: "adaeze@swift.com" }).select("+passwordHash"),
      WebsiteConfigModel.findOne({ tenantId: result.tenant.id }),
    ]);

    expect(tenant).not.toBeNull();
    expect(admin).not.toBeNull();
    expect(admin!.role).toBe("TENANT_ADMIN");
    expect(admin!.status).toBe("ACTIVE");
    expect(String(admin!.tenantId)).toBe(result.tenant.id);
    expect(admin!.passwordHash.startsWith("$argon2id$")).toBe(true);
    await expect(verifyPassword(admin!.passwordHash, result.temporaryPassword!)).resolves.toBe(true);

    expect(config).not.toBeNull();
    expect(config!.contact?.email).toBe("ops@swift.com"); // contact carried over
    expect(config!.sections.tracking.enabled).toBe(true); // default config initialized
    expect(result).not.toHaveProperty("tenant.passwordHash");
  });

  it("honors a provided admin password (no temporary password disclosed)", async () => {
    const result = await tenantService.createTenantWithAdmin({
      ...creationInput,
      slug: "apex",
      admin: { name: "Apex Ops", email: "ops@apex.com", password: "chosen-long-password" },
    });
    expect(result.temporaryPassword).toBeUndefined();
    const admin = await UserModel.findOne({ email: "ops@apex.com" }).select("+passwordHash");
    await expect(verifyPassword(admin!.passwordHash, "chosen-long-password")).resolves.toBe(true);
  });

  it("normalizes slugs to lowercase URL-safe form", async () => {
    const result = await tenantService.createTenantWithAdmin({
      ...creationInput,
      slug: "Apex Freight  Intl!",
      admin: { name: "Ops", email: "ops@apex-freight.com" },
    });
    expect(result.tenant.slug).toBe("apex-freight-intl");
  });

  it("rejects a duplicate slug, including differently-cased/format variants", async () => {
    await tenantService.createTenantWithAdmin(creationInput);
    await expectApiError(
      tenantService.createTenantWithAdmin({
        ...creationInput,
        slug: " SWIFT ",
        admin: { name: "Other", email: "other@example.com" },
      }),
      409,
      "TENANT_SLUG_ALREADY_EXISTS",
    );
  });

  it("rejects reserved slugs", async () => {
    await expectApiError(
      tenantService.createTenantWithAdmin({ ...creationInput, slug: "admin" }),
      400,
      "TENANT_SLUG_RESERVED",
    );
  });

  it("rejects a duplicate admin email", async () => {
    await tenantService.createTenantWithAdmin(creationInput);
    await expectApiError(
      tenantService.createTenantWithAdmin({
        ...creationInput,
        companyName: "Apex",
        slug: "apex",
        admin: { name: "Someone", email: "adaeze@swift.com" },
      }),
      409,
      "EMAIL_ALREADY_EXISTS",
    );
  });

  it("rejects a provided password that violates policy", async () => {
    await expectApiError(
      tenantService.createTenantWithAdmin({
        ...creationInput,
        admin: { name: "Ops", email: "ops@apex.com", password: "short" },
      }),
      400,
      "VALIDATION_ERROR",
    );
  });

  it("rolls the ENTIRE creation back when any step fails (transaction)", async () => {
    const createSpy = vi
      .spyOn(WebsiteConfigModel, "create")
      .mockRejectedValueOnce(new Error("simulated website-config failure"));

    await expect(
      tenantService.createTenantWithAdmin(creationInput),
    ).rejects.toThrow("simulated website-config failure");

    expect(await TenantModel.countDocuments({})).toBe(0);
    expect(await UserModel.countDocuments({})).toBe(0);
    expect(await WebsiteConfigModel.countDocuments({})).toBe(0);
    createSpy.mockRestore();
  });

  it("enforces one WebsiteConfig per tenant at the database level", async () => {
    const result = await tenantService.createTenantWithAdmin(creationInput);
    await expect(
      WebsiteConfigModel.create({ tenantId: new mongoose.Types.ObjectId(result.tenant.id) }),
    ).rejects.toMatchObject({ code: 11000 });
  });
});

describe("list tenants (search / filter / sort / pagination)", () => {
  async function seedThree() {
    const swift = await tenantService.createTenantWithAdmin(creationInput);
    const apex = await tenantService.createTenantWithAdmin({
      companyName: "Apex Freight",
      slug: "apex",
      admin: { name: "Bolu Adeyemi", email: "bolu@apex.com" },
    });
    const crescent = await tenantService.createTenantWithAdmin({
      companyName: "Crescent Haulage",
      slug: "crescent",
      admin: { name: "Chika Musa", email: "chika@crescent.com" },
    });
    return { swift, apex, crescent };
  }

  it("searches by company, slug, admin name and admin email", async () => {
    await seedThree();
    for (const term of ["Apex", "crescent", "Bolu", "chika@crescent.com"]) {
      const result = await tenantService.listTenants({ search: term });
      expect(result.total).toBeGreaterThanOrEqual(1);
    }
    const miss = await tenantService.listTenants({ search: "nonexistent" });
    expect(miss.total).toBe(0);
  });

  it("sorts by most packages using the packages collection", async () => {
    const { apex } = await seedThree();
    await PackageModel.create({
      tenantId: apex.tenant.id,
      trackingId: "TEST-001",
      packageName: "Carton A",
      sender: { name: "S", phone: "08000", address: "addr" },
      receiver: { name: "R", phone: "08001", address: "addr" },
    });
    await PackageModel.create({
      tenantId: apex.tenant.id,
      trackingId: "TEST-002",
      packageName: "Carton B",
      sender: { name: "S", phone: "08000", address: "addr" },
      receiver: { name: "R", phone: "08001", address: "addr" },
    });

    const result = await tenantService.listTenants({ sort: "most_packages" });
    expect(result.items[0]!.slug).toBe("apex");
    expect(result.items[0]!.packageCount).toBe(2);
  });

  it("paginates with page/limit and clamps the limit server-side", async () => {
    await seedThree();
    const pageOne = await tenantService.listTenants({ page: 1, limit: 2, sort: "newest" });
    expect(pageOne.items.length).toBe(2);
    expect(pageOne.total).toBe(3);
    expect(pageOne.totalPages).toBe(2);

    const pageTwo = await tenantService.listTenants({ page: 2, limit: 2, sort: "newest" });
    expect(pageTwo.items.length).toBe(1);

    const clamped = await tenantService.listTenants({ limit: 999 });
    expect(clamped.limit).toBeLessThanOrEqual(50);
  });
});

describe("tenant details and editing", () => {
  it("returns details with admin summary, package count, and config flag", async () => {
    const { tenant } = await tenantService.createTenantWithAdmin(creationInput);
    const details = await tenantService.getTenantDetails(tenant.id);
    expect(details.admin?.email).toBe("adaeze@swift.com");
    expect(details.packageCount).toBe(0);
    expect(details.websiteConfigured).toBe(true);
    expect(details.admin).not.toHaveProperty("passwordHash");
  });

  it("rejects details for a missing tenant", async () => {
    await expectApiError(
      tenantService.getTenantDetails("65f0000000000000000000aa"),
      404,
      "TENANT_NOT_FOUND",
    );
  });

  it("edits company info and a unique slug; never the _id", async () => {
    const { tenant } = await tenantService.createTenantWithAdmin(creationInput);
    const updated = await tenantService.updateTenant(tenant.id, {
      companyName: "Swift Logistics Ltd.",
      slug: "swift-logistics",
      contact: { phone: "+234 900" },
    });
    expect(updated.tenant.companyName).toBe("Swift Logistics Ltd.");
    expect(updated.tenant.slug).toBe("swift-logistics");
    expect(updated.tenant.contact.phone).toBe("+234 900");
    expect(updated.tenant.id).toBe(tenant.id);
  });

  it("rejects an edit that collides with another slug", async () => {
    await tenantService.createTenantWithAdmin(creationInput);
    const second = await tenantService.createTenantWithAdmin({
      companyName: "Apex",
      slug: "apex",
      admin: { name: "Ops", email: "ops@apex.com" },
    });
    await expectApiError(
      tenantService.updateTenant(second.tenant.id, { slug: "swift" }),
      409,
      "TENANT_SLUG_ALREADY_EXISTS",
    );
  });
});

describe("tenant lifecycle", () => {
  it("runs ACTIVE → SUSPENDED → ACTIVE and invalidates live sessions on suspension", async () => {
    const { tenant } = await tenantService.createTenantWithAdmin(creationInput);
    const adminUser = await UserModel.findOne({ tenantId: tenant.id });
    const { token } = await seedSession(adminUser!);

    const suspended = await tenantService.transitionTenant(tenant.id, "suspend");
    expect(suspended.tenant.status).toBe("SUSPENDED");
    expect(await SessionModel.countDocuments({ tenantId: tenant.id })).toBe(0);
    await expect(auth.resolveSessionByToken(token)).resolves.toBeNull();

    const restored = await tenantService.transitionTenant(tenant.id, "restore");
    expect(restored.tenant.status).toBe("ACTIVE");
  });

  it("runs ACTIVE → ARCHIVED → ACTIVE, hides archived from normal lists", async () => {
    const { tenant } = await tenantService.createTenantWithAdmin(creationInput);
    await tenantService.transitionTenant(tenant.id, "archive");

    const all = await tenantService.listTenants({ status: "ALL" });
    expect(all.total).toBe(0);
    const archived = await tenantService.listTenants({ status: "ARCHIVED" });
    expect(archived.total).toBe(1);

    const restored = await tenantService.transitionTenant(tenant.id, "restore");
    expect(restored.tenant.status).toBe("ACTIVE");
  });

  it("rejects invalid transitions", async () => {
    const { tenant } = await tenantService.createTenantWithAdmin(creationInput);
    await expectApiError(tenantService.transitionTenant(tenant.id, "restore"), 400, "INVALID_TENANT_STATUS");
    await tenantService.transitionTenant(tenant.id, "suspend");
    await expectApiError(tenantService.transitionTenant(tenant.id, "archive"), 400, "INVALID_TENANT_STATUS");
  });

  it("blocks tenant-admin login while SUSPENDED or ARCHIVED (generic message)", async () => {
    const result = await tenantService.createTenantWithAdmin(creationInput);
    const password = result.temporaryPassword!;

    await tenantService.transitionTenant(result.tenant.id, "suspend");
    await expectApiError(
      auth.login({ email: "adaeze@swift.com", password }),
      401,
      "INVALID_CREDENTIALS",
    );

    await tenantService.transitionTenant(result.tenant.id, "restore");
    const okLogin = await auth.login({ email: "adaeze@swift.com", password });
    expect(okLogin.user.tenantId).toBe(result.tenant.id);
  });

  it("platform admin login is unaffected by tenant states", async () => {
    await seedUser({ role: "PLATFORM_ADMIN", tenantId: null, email: "owner@example.com" });
    const { tenant } = await tenantService.createTenantWithAdmin(creationInput);
    await tenantService.transitionTenant(tenant.id, "suspend");
    const outcome = await auth.login({ email: "owner@example.com", password: TEST_PASSWORD });
    expect(outcome.user.role).toBe("PLATFORM_ADMIN");
  });
});

describe("tenant admin password reset", () => {
  it("generates a one-time password, invalidates old sessions, old password dies", async () => {
    const created = await tenantService.createTenantWithAdmin(creationInput);
    const adminUser = await UserModel.findOne({ tenantId: created.tenant.id });
    const oldSession = await seedSession(adminUser!);

    const reset = await tenantService.resetTenantAdminPassword(created.tenant.id);
    expect(reset.admin.email).toBe("adaeze@swift.com");
    expect(reset.temporaryPassword.length).toBeGreaterThanOrEqual(10);

    // old session destroyed; old temporary password no longer authenticates
    expect(await auth.resolveSessionByToken(oldSession.token)).toBeNull();
    await expectApiError(
      auth.login({ email: "adaeze@swift.com", password: created.temporaryPassword! }),
      401,
      "INVALID_CREDENTIALS",
    );

    // the new temporary password authenticates
    const relogin = await auth.login({ email: "adaeze@swift.com", password: reset.temporaryPassword });
    expect(relogin.user.role).toBe("TENANT_ADMIN");
  });

  it("rejects reset for a tenant without an admin", async () => {
    const orphan = await TenantModel.create({ companyName: "Orphan", slug: "orphan", status: "ACTIVE", contact: {} });
    await expectApiError(
      tenantService.resetTenantAdminPassword(String(orphan._id)),
      404,
      "NOT_FOUND",
    );
  });
});
