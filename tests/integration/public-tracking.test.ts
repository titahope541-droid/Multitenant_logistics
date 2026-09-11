/**
 * Public tracking + public website data — the allowlist is a SECURITY
 * boundary. These tests assert what the payload does NOT contain as much
 * as what it does, plus tenant-status and cross-tenant behavior.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ApiError } from "@/server/http/errors";
import { PackageModel } from "@/db/models/package.model";
import { StatusEventModel } from "@/db/models/status-event.model";
import { WebsiteConfigModel } from "@/db/models/website-config.model";
import * as publicTracking from "@/server/services/public-tracking.service";
import * as websiteService from "@/server/services/website.service";
import type { ResolvedTenant } from "@/server/services/tenant-resolution.service";
import {
  clearMemoryMongo,
  startMemoryMongo,
  stopMemoryMongo,
} from "../helpers/mongo-memory";
import { seedTenant } from "../helpers/seed";
import type { HydratedDocument } from "mongoose";
import type { TenantDocument } from "@/db/models/tenant.model";
import type { TenantStatus } from "@/types/domain";

beforeAll(startMemoryMongo);
afterEach(clearMemoryMongo);
afterAll(stopMemoryMongo);

function resolved(doc: HydratedDocument<TenantDocument>, status?: TenantStatus): ResolvedTenant {
  return {
    id: String(doc._id),
    companyName: doc.companyName,
    slug: doc.slug,
    status: status ?? doc.status,
    contact: doc.contact ?? {},
  };
}

const SENSITIVE = {
  senderPhone: "0800SENDER",
  senderEmail: "sender-secret@example.com",
  senderAddress: "44 Secret Sender Street",
  receiverPhone: "0800RECEIVER",
  receiverEmail: "receiver-secret@example.com",
  receiverAddress: "17 Hidden Receiver Avenue",
  paymentMethod: "Under-the-table Cash",
  shippingCost: 98765,
};

async function expectApiError(promise: Promise<unknown>, status: number, code: string, message?: string) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(status);
  expect((error as ApiError).code).toBe(code);
  if (message) expect((error as ApiError).message).toBe(message);
}

async function seedRichPackage(tenant: HydratedDocument<TenantDocument>, overrides: { trackingId?: string; archived?: boolean } = {}) {
  const pkg = await PackageModel.create({
    tenantId: tenant._id,
    trackingId: overrides.trackingId ?? "PKG-SEC-20260909-AAAA11",
    packageName: "Confidential Crate",
    status: "IN_TRANSIT",
    sender: {
      name: "Sender Person",
      phone: SENSITIVE.senderPhone,
      email: SENSITIVE.senderEmail,
      address: SENSITIVE.senderAddress,
    },
    receiver: {
      name: "Receiver Person",
      phone: SENSITIVE.receiverPhone,
      email: SENSITIVE.receiverEmail,
      address: SENSITIVE.receiverAddress,
    },
    payment: { paymentMethod: SENSITIVE.paymentMethod, paymentStatus: "PAID", shippingCost: SENSITIVE.shippingCost },
    delivery: { estimatedDeliveryDate: new Date("2026-10-05T00:00:00Z") },
    currentLocation: { latitude: 6.4, longitude: 3.4, locationName: "Somewhere Hub", updatedAt: new Date("2026-09-09T12:00:00Z") },
    archived: overrides.archived ?? false,
  });
  for (const [status, note, day] of [
    ["PENDING", "created", 1],
    ["PROCESSED", "sorted", 2],
    ["IN_TRANSIT", "left origin", 3],
  ] as const) {
    await StatusEventModel.create({
      tenantId: tenant._id,
      packageId: pkg._id,
      status,
      note,
      createdAt: new Date(Date.UTC(2026, 8, day)),
    });
  }
  return pkg;
}

describe("public tracking allowlist (MANDATORY security test)", () => {
  it("returns only allowlisted data — sensitive fields never appear", async () => {
    const tenant = await seedTenant({ slug: "swift" });
    await seedRichPackage(tenant);

    const result = await publicTracking.getPublicTracking(resolved(tenant), "pkg-sec-20260909-aaaa11");

    expect(result.trackingId).toBe("PKG-SEC-20260909-AAAA11");
    expect(result.packageName).toBe("Confidential Crate");
    expect(result.senderName).toBe("Sender Person");
    expect(result.receiverName).toBe("Receiver Person");
    expect(result.status).toBe("IN_TRANSIT");
    expect(result.estimatedDelivery).toBeDefined();
    expect(result.currentLocation?.locationName).toBe("Somewhere Hub");
    expect(result.timeline.map((event) => event.status)).toEqual(["PENDING", "PROCESSED", "IN_TRANSIT"]);
    expect(result.timeline[1]!.note).toBe("sorted");

    // the strict negative space — the whole point of this endpoint
    const serialized = JSON.stringify(result);
    for (const needle of [
      SENSITIVE.senderPhone,
      SENSITIVE.senderEmail,
      SENSITIVE.senderAddress,
      SENSITIVE.receiverPhone,
      SENSITIVE.receiverEmail,
      SENSITIVE.receiverAddress,
      SENSITIVE.paymentMethod,
      String(SENSITIVE.shippingCost),
      "passwordHash",
      "tenantId",
      ' "_id"',
    ]) {
      expect(serialized.includes(needle)).toBe(false);
    }
  });

  it("treats archived packages exactly like unknown IDs (no existence leak)", async () => {
    const tenant = await seedTenant({ slug: "swift" });
    await seedRichPackage(tenant, { archived: true });

    const archived = await publicTracking
      .getPublicTracking(resolved(tenant), "PKG-SEC-20260909-AAAA11")
      .catch((caught: unknown) => caught);
    const unknown = await publicTracking
      .getPublicTracking(resolved(tenant), "PKG-NOPE-00000000-ZZZZ99")
      .catch((caught: unknown) => caught);

    for (const error of [archived, unknown]) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(404);
      expect((error as ApiError).code).toBe("PACKAGE_NOT_FOUND");
    }
    expect((archived as ApiError).message).toBe((unknown as ApiError).message);
  });

  it("blocks tracking on SUSPENDED and ARCHIVED tenants", async () => {
    const tenant = await seedTenant({ slug: "swift" });
    await seedRichPackage(tenant);

    await expectApiError(
      publicTracking.getPublicTracking(resolved(tenant, "SUSPENDED"), "PKG-SEC-20260909-AAAA11"),
      403,
      "TENANT_SUSPENDED",
    );
    await expectApiError(
      publicTracking.getPublicTracking(resolved(tenant, "ARCHIVED"), "PKG-SEC-20260909-AAAA11"),
      403,
      "TENANT_ARCHIVED",
    );
  });

  it("cannot read tenant B's package from tenant A's context — but B reads it on B", async () => {
    const tenantA = await seedTenant({ slug: "alpha" });
    const tenantB = await seedTenant({ slug: "beta" });
    await seedRichPackage(tenantB, { trackingId: "PKG-BET-20260909-BBBB22" });

    await expectApiError(
      publicTracking.getPublicTracking(resolved(tenantA), "PKG-BET-20260909-BBBB22"),
      404,
      "PACKAGE_NOT_FOUND",
    );
    const onB = await publicTracking.getPublicTracking(resolved(tenantB), "PKG-BET-20260909-BBBB22");
    expect(onB.trackingId).toBe("PKG-BET-20260909-BBBB22");
  });
});

describe("public website data", () => {
  it("maps config into the public render model without internal ids", async () => {
    const tenant = await seedTenant({ slug: "swift", companyName: "Swift Logistics" });
    await WebsiteConfigModel.create({
      tenantId: tenant._id,
      branding: { primaryColor: "#112233", tagline: "We fly freight." },
      navigation: [{ label: "Services", href: "/#services" }],
      sections: {
        services: { enabled: true, items: [{ title: "Same-day", description: "City-wide" }] },
        about: { enabled: true, text: "Family-run since 2010." },
      },
      contact: { email: "hello@swift.example.com" },
      socialLinks: [{ platform: "LinkedIn", url: "https://linkedin.com/company/swift" }],
    });

    const data = await websiteService.getPublicWebsiteData(resolved(tenant));
    expect(data.companyName).toBe("Swift Logistics");
    expect(data.branding.primaryColor).toBe("#112233");
    expect(data.sections.services.items[0]!.title).toBe("Same-day");
    expect(data.sections.about.text).toBe("Family-run since 2010.");
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("tenantId");
    expect(serialized).not.toContain('_id');
  });

  it("falls back to identity defaults when the config row is missing", async () => {
    const tenant = await seedTenant({ slug: "swift", companyName: "Swift Logistics" });
    const data = await websiteService.getPublicWebsiteData(resolved(tenant));
    expect(data.usingDefaults).toBe(true);
    expect(data.sections.hero.headline).toContain("Swift Logistics");
    expect(data.sections.services.items).toEqual([]); // no fabricated services
  });
});
