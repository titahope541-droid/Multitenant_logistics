/**
 * Validation hardness — the package boundary must refuse malformed,
 * out-of-range, oversized, or smuggled input (zod before services, always).
 */

import { describe, expect, it } from "vitest";
import { PACKAGE_STATUSES } from "@/types/domain";
import {
  changePackageStatusSchema,
  createPackageSchema,
  listPackagesQuerySchema,
  updateLocationSchema,
} from "@/server/validators/package.validators";

const party = { name: "Ada", phone: "08011234567", address: "21 Marina Rd" };
const base = {
  packageName: "Crate",
  sender: party,
  receiver: { name: "Femi", phone: "08022222222", address: "Abuja" },
};

describe("createPackageSchema rejections", () => {
  const bad: Array<[string, unknown]> = [
    ["missing sender.phone", { ...base, sender: { name: "Ada", address: "x" } }],
    ["negative weight", { ...base, specifications: { weight: -1 } }],
    ["negative shippingCost", { ...base, payment: { shippingCost: -5 } }],
    ["malformed sender email", { ...base, sender: { ...party, email: "nope@" } }],
    ["packageName too long", { ...base, packageName: "x".repeat(161) }],
    ["lat out of range", { ...base, currentLocation: { latitude: 91, longitude: 3 } }],
    ["lng out of range", { ...base, currentLocation: { latitude: 6, longitude: -181 } }],
    ["SMUGGLED tenantId (never trusted)", { ...base, tenantId: "65f0000000000000000000aa" }],
    ["smuggled trackingId (server-minted only)", { ...base, trackingId: "HAX" }],
    ["smuggled status (server-owned)", { ...base, status: "DELIVERED" }],
    ["smuggled archived flag", { ...base, archived: true }],
    ["unknown extra field", { ...base, surprise: "field" }],
  ];

  for (const [label, payload] of bad) {
    it(label, () => {
      expect(createPackageSchema.safeParse(payload).success).toBe(false);
    });
  }

  it("accepts a minimal valid payload", () => {
    expect(createPackageSchema.safeParse(base).success).toBe(true);
  });
});

describe("status / location schemas", () => {
  it("status accepts only the exact five values", () => {
    for (const status of ["PENDING", "PROCESSED", "IN_TRANSIT", "ARRIVED_AT_FACILITY", "DELIVERED"]) {
      expect(changePackageStatusSchema.safeParse({ status }).success).toBe(true);
    }
    for (const status of ["OUT_FOR_DELIVERY", "SHIPPED", "CANCELLED", "delivered", ""]) {
      expect(changePackageStatusSchema.safeParse({ status }).success).toBe(false);
    }
  });

  it("location boundaries are strict", () => {
    expect(updateLocationSchema.safeParse({ latitude: 90, longitude: 180 }).success).toBe(true);
    expect(updateLocationSchema.safeParse({ latitude: -90.0001, longitude: 0 }).success).toBe(false);
    expect(updateLocationSchema.safeParse({ latitude: 0, longitude: 180.0001 }).success).toBe(false);
  });
});

describe("list query hardening", () => {
  it("rejects hostile shapes and clamps through position", () => {
    expect(listPackagesQuerySchema.safeParse({ limit: "999" }).success).toBe(false); // > 50
    expect(listPackagesQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(listPackagesQuerySchema.safeParse({ status: "SHIPPED" }).success).toBe(false);
    expect(listPackagesQuerySchema.safeParse({ archived: "yes" }).success).toBe(false); // exactly "true"
    expect(listPackagesQuerySchema.safeParse({ search: "s".repeat(161) }).success).toBe(false);
    const ok = listPackagesQuerySchema.safeParse({ page: "2", limit: "25", status: "ALL" });
    expect(ok.success).toBe(true);
  });
});

describe("the status enum is exactly the locked five (drift alarm)", () => {
  it("no widenings anywhere in the shared definition", () => {
    expect(PACKAGE_STATUSES).toEqual([
      "PENDING",
      "PROCESSED",
      "IN_TRANSIT",
      "ARRIVED_AT_FACILITY",
      "DELIVERED",
    ]);
    expect(PACKAGE_STATUSES.length).toBe(5);
  });
});
