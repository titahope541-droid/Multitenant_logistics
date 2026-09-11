/**
 * Index inventory — the declared Mongoose indexes must stay exactly the
 * locked set (no drift, no accidental loss, no unexplained redundancy).
 * Asserted from the model definitions themselves, before any DB exists.
 */

import { describe, expect, it } from "vitest";
import { TenantModel } from "@/db/models/tenant.model";
import { UserModel } from "@/db/models/user.model";
import { PackageModel } from "@/db/models/package.model";
import { StatusEventModel } from "@/db/models/status-event.model";
import { LocationHistoryModel } from "@/db/models/location-history.model";
import { WebsiteConfigModel } from "@/db/models/website-config.model";
import { MODELS } from "@/db/models";

function keys(model: unknown): string[] {
  const schema = (model as { schema: { indexes(): [Record<string, unknown>, Record<string, unknown>][] } }).schema;
  return schema.indexes().map(([k, opts]) => {
    const flags = [opts.unique ? "U" : null, opts.partialFilterExpression ? "P" : null].filter(Boolean).join("+");
    return `${JSON.stringify(k)}${flags ? ` ${flags}` : ""}`;
  });
}

function expectSet(actual: string[], mustContain: string[]) {
  for (const expected of mustContain) {
    expect(actual, `missing index ${expected}`).toContain(expected);
  }
}

describe("locked index inventory", () => {
  it("six business models + sessions infra, nothing else registered", () => {
    expect(MODELS.map((m) => m.collection.name).sort()).toEqual([
      "location_history",
      "packages",
      "sessions",
      "status_events",
      "tenants",
      "users",
      "website_configs",
    ]);
  });

  it("tenants: unique slug + status", () => {
    expectSet(keys(TenantModel), ['{"slug":1} U', '{"status":1}']);
  });

  it("users: unique email, tenantId, role, two partial uniques", () => {
    const actual = keys(UserModel);
    expectSet(actual, ['{"email":1} U', '{"tenantId":1}', '{"role":1}']);
    expect(actual.filter((x) => x.includes("P")).length).toBe(2); // one_platform_admin + one_tenant_admin_per_tenant
  });

  it("packages: unique trackingId + four tenant compounds", () => {
    expectSet(keys(PackageModel), [
      '{"trackingId":1} U',
      '{"tenantId":1,"trackingId":1}',
      '{"tenantId":1,"status":1}',
      '{"tenantId":1,"createdAt":-1}',
      '{"tenantId":1,"archived":1}',
    ]);
  });

  it("status_events and location_history carry timeline + tenant indexes", () => {
    expectSet(keys(StatusEventModel), ['{"packageId":1,"createdAt":1}', '{"tenantId":1,"packageId":1}']);
    expectSet(keys(LocationHistoryModel), ['{"packageId":1,"createdAt":-1}', '{"tenantId":1,"packageId":1}']);
  });

  it("website_configs: unique tenantId", () => {
    expectSet(keys(WebsiteConfigModel), ['{"tenantId":1} U']);
  });
});
