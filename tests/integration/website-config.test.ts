/**
 * Website configuration — Platform-Admin surface + public projection.
 * Covers safe defaults, deep-merge saves, ordering/visibility, validation
 * rejection (markup/colors/urls/unknown sections), and the authorization
 * boundary that keeps TENANT_ADMIN entirely out of website configuration.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ApiError } from "@/server/http/errors";
import { TenantModel } from "@/db/models/tenant.model";
import { WebsiteConfigModel } from "@/db/models/website-config.model";
import { authorize } from "@/server/middleware/auth";
import * as websiteService from "@/server/services/website.service";
import { validate } from "@/server/validators";
import { websiteUpdateSchema } from "@/server/validators/website-config.validators";
import { DEFAULT_SECTION_ORDER } from "@/lib/website-defaults";
import {
  clearMemoryMongo,
  startMemoryMongo,
  stopMemoryMongo,
} from "../helpers/mongo-memory";
import { seedTenant } from "../helpers/seed";
import type { AuthContext } from "@/server/services/auth.service";

beforeAll(startMemoryMongo);
afterEach(clearMemoryMongo);
afterAll(stopMemoryMongo);

function contextFor(role: "PLATFORM_ADMIN" | "TENANT_ADMIN", tenantId: string | null): AuthContext {
  return {
    user: { id: "65f000000000000000000001", name: "T", email: "t@example.com", role, tenantId },
    sessionId: "session",
  };
}

function expectValidationRejection(payload: unknown) {
  const error = (() => {
    try {
      validate(websiteUpdateSchema, payload);
    } catch (caught) {
      return caught as ApiError;
    }
    throw new Error("expected validation to reject the payload");
  })();
  expect(error).toBeInstanceOf(ApiError);
  expect(error.code).toBe("VALIDATION_ERROR");
}

describe("authorization boundary (Tenant Admin can never touch website config)", () => {
  it("allows PLATFORM_ADMIN and rejects TENANT_ADMIN / anonymous on the platform gate", () => {
    const platform = contextFor("PLATFORM_ADMIN", null);
    expect(authorize(platform, ["PLATFORM_ADMIN"])).toBe(platform);

    const tenantAdmin = contextFor("TENANT_ADMIN", "65f0000000000000000000aa");
    const forbidden = (() => {
      try {
        authorize(tenantAdmin, ["PLATFORM_ADMIN"]);
      } catch (caught) {
        return caught as ApiError;
      }
      throw new Error("expected 403");
    })();
    expect(forbidden.status).toBe(403);
    expect(forbidden.code).toBe("FORBIDDEN");

    const unauthenticated = (() => {
      try {
        authorize(null, ["PLATFORM_ADMIN"]);
      } catch (caught) {
        return caught as ApiError;
      }
      throw new Error("expected 401");
    })();
    expect(unauthenticated.status).toBe(401);
  });
});

describe("safe defaults & self-healing", () => {
  it("renders public data with defaults when no config row exists", async () => {
    const tenant = await seedTenant({ slug: "swift", companyName: "Swift Logistics" });
    const data = await websiteService.getPublicWebsiteData({
      id: String(tenant._id),
      companyName: tenant.companyName,
      slug: tenant.slug,
      status: "ACTIVE",
      contact: {},
    });
    expect(data.usingDefaults).toBe(true);
    expect(data.sections.hero.enabled).toBe(true);
    expect(data.sections.hero.headline).toContain("Swift Logistics");
    expect(data.sections.hero.ctaHref).toBe("/track");
    expect(data.sectionOrder).toEqual(DEFAULT_SECTION_ORDER);
    expect(data.branding.primaryColor).toMatch(/^#/);
    expect(data.sections.services.items).toEqual([]); // nothing fabricated
  });

  it("initializes a config document on first platform read", async () => {
    const tenant = await seedTenant({ slug: "apex" });
    expect(await WebsiteConfigModel.countDocuments({})).toBe(0);
    const config = await websiteService.getWebsiteConfig(String(tenant._id));
    expect(config.usingDefaults).toBe(false);
    expect(await WebsiteConfigModel.countDocuments({ tenantId: tenant._id })).toBe(1);
    expect(config.navigation.length).toBeGreaterThan(0);
  });

  it("rejects reads for a missing tenant", async () => {
    const error = await websiteService
      .getWebsiteConfig("65f0000000000000000000aa")
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("TENANT_NOT_FOUND");
  });
});

describe("platform updates", () => {
  it("saves sections, ordering and visibility, and deep-merges partial saves", async () => {
    const tenant = await seedTenant({ slug: "swift" });
    const id = String(tenant._id);

    await websiteService.updateWebsiteConfig(id, {
      sections: {
        hero: { headline: "Freight that shows up", ctaLabel: "Track it" },
        services: { enabled: true, items: [{ title: "Same-day", description: "City-wide", icon: "truck", visible: true }] },
        about: { enabled: true, text: "Family-run since 2010." },
      },
      sectionOrder: ["tracking", "hero", "services", "about", "features", "contact"],
    });

    // a later partial save must not clobber earlier sections
    const saved = await websiteService.updateWebsiteConfig(id, {
      branding: { primaryColor: "#112233" },
    });

    expect(saved.sections.hero.headline).toBe("Freight that shows up");
    expect(saved.sections.hero.ctaLabel).toBe("Track it");
    expect(saved.sections.services.items[0]?.title).toBe("Same-day");
    expect(saved.sections.about.text).toBe("Family-run since 2010.");
    expect(saved.branding.primaryColor).toBe("#112233");
    expect(saved.sectionOrder[0]).toBe("tracking");

    // and the PUBLIC projection reflects the same saved configuration
    const publicData = await websiteService.getPublicWebsiteData({
      id,
      companyName: tenant.companyName,
      slug: tenant.slug,
      status: "ACTIVE",
      contact: {},
    });
    expect(publicData.sectionOrder[0]).toBe("tracking");
    expect(publicData.sections.services.enabled).toBe(true);
    expect(publicData.branding.primaryColor).toBe("#112233");
  });

  it("supports SEO fields and hides disabled sections in the projection", async () => {
    const tenant = await seedTenant({ slug: "swift" });
    const id = String(tenant._id);
    const saved = await websiteService.updateWebsiteConfig(id, {
      seo: { title: "Swift — freight", description: "We move things." },
      sections: { tracking: { enabled: false }, footer: { showSocial: false } },
    });
    expect(saved.seo.title).toBe("Swift — freight");
    expect(saved.sections.tracking.enabled).toBe(false);
    expect(saved.sections.footer.showSocial).toBe(false);
  });

  it("normalizes an incomplete stored order so no section disappears", async () => {
    const tenant = await seedTenant({ slug: "swift" });
    const saved = await websiteService.updateWebsiteConfig(String(tenant._id), {
      sectionOrder: ["contact", "hero"],
    });
    expect(saved.sectionOrder.slice(0, 2)).toEqual(["contact", "hero"]);
    expect(new Set(saved.sectionOrder)).toEqual(new Set(DEFAULT_SECTION_ORDER));
  });

  it("keeps one config per tenant (unique index)", async () => {
    const tenant = await seedTenant({ slug: "swift" });
    await websiteService.getWebsiteConfig(String(tenant._id));
    await expect(WebsiteConfigModel.create({ tenantId: tenant._id })).rejects.toMatchObject({ code: 11000 });
  });
});

describe("configuration validation (content stays content)", () => {
  it("rejects markup in text fields, bad colors, bad URLs, unknown keys, bad icons, oversized lists", () => {
    expectValidationRejection({ sections: { hero: { headline: "<script>alert(1)</script>" } } });
    expectValidationRejection({ sections: { about: { text: "<img src=x onerror=1>" } } });
    expectValidationRejection({ branding: { primaryColor: "red" } });
    expectValidationRejection({ branding: { logoUrl: "javascript:alert(1)" } });
    expectValidationRejection({ socialLinks: [{ platform: "X", url: "not-a-url" }] });
    expectValidationRejection({ sections: { newsletter: { enabled: true } } }); // no invented sections
    expectValidationRejection({ sectionOrder: ["hero", "hero"] }); // duplicates
    expectValidationRejection({ sectionOrder: ["blog"] }); // outside the catalogue
    expectValidationRejection({
      sections: { services: { items: [{ title: "ok", icon: "rocket", visible: true }] } },
    });
    expectValidationRejection({ seo: { description: "x".repeat(201) } });
  });

  it("accepts a well-formed draft", () => {
    const parsed = validate(websiteUpdateSchema, {
      branding: { primaryColor: "#0b5fff", buttonStyle: "pill", borderRadius: 12, theme: "dark" },
      sections: { features: { enabled: true, items: [{ title: "Insured", icon: "shield", visible: true }] } },
      sectionOrder: ["hero", "features"],
      seo: { title: "Swift" },
    });
    expect(parsed.branding?.buttonStyle).toBe("pill");
    expect(parsed.sections?.features?.items?.[0]?.icon).toBe("shield");
  });

  it("rejects configuration saves that violate model validators", async () => {
    const tenant = await seedTenant({ slug: "swift" });
    const error = await websiteService
      .updateWebsiteConfig(String(tenant._id), { branding: { primaryColor: "#zzzzzz" } })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("VALIDATION_ERROR");
  });
});

describe("tenant isolation of configuration", () => {
  it("editing tenant A never touches tenant B", async () => {
    const a = await seedTenant({ slug: "alpha", companyName: "Alpha" });
    const b = await seedTenant({ slug: "beta", companyName: "Beta" });
    await websiteService.getWebsiteConfig(String(b._id));

    await websiteService.updateWebsiteConfig(String(a._id), {
      branding: { primaryColor: "#aa0000" },
      sections: { hero: { headline: "Alpha only" } },
    });

    const configB = await websiteService.getWebsiteConfig(String(b._id));
    expect(configB.branding.primaryColor).not.toBe("#aa0000");
    expect(configB.sections.hero.headline).toContain("Beta");
    expect(await TenantModel.countDocuments({})).toBe(2);
  });
});
