/**
 * Seed a demo tenant + its single Tenant Admin (development tooling ONLY).
 * Used to manually verify Phase 3 behaviors: tenant-scoped login, and
 * login blocking when the tenant is SUSPENDED / ARCHIVED (flip
 * db.tenants.status in mongosh to test, then set it back).
 *
 * Credentials come ONLY from environment variables — never hardcoded.
 *
 * Usage:
 *   DEMO_TENANT_SLUG=swift DEMO_TENANT_COMPANY="Swift Logistics" \
 *   DEMO_TENANT_ADMIN_NAME="Swift Ops" \
 *   DEMO_TENANT_ADMIN_EMAIL="ops@swift.example.com" \
 *   DEMO_TENANT_ADMIN_PASSWORD="a-long-secret" \
 *   npx tsx scripts/seed-demo-tenant.ts
 */

import "dotenv/config";
import mongoose from "mongoose";
import { TenantModel } from "../src/db/models/tenant.model";
import { UserModel } from "../src/db/models/user.model";
import { checkPasswordPolicy, hashPassword } from "../src/server/utils/password";
import { EMAIL_PATTERN, SLUG_PATTERN } from "../src/lib/validation-patterns";

const {
  MONGODB_URI,
  DEMO_TENANT_SLUG,
  DEMO_TENANT_COMPANY,
  DEMO_TENANT_ADMIN_NAME,
  DEMO_TENANT_ADMIN_EMAIL,
  DEMO_TENANT_ADMIN_PASSWORD,
} = process.env;

function fail(message: string): never {
  console.error(`seed-demo-tenant: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  if (!MONGODB_URI) fail("MONGODB_URI is not set (check your .env)");
  if (!DEMO_TENANT_SLUG || !SLUG_PATTERN.test(DEMO_TENANT_SLUG)) {
    fail("DEMO_TENANT_SLUG is required (lowercase letters/numbers/hyphens)");
  }
  if (!DEMO_TENANT_COMPANY?.trim()) fail("DEMO_TENANT_COMPANY is required");
  if (!DEMO_TENANT_ADMIN_NAME?.trim()) fail("DEMO_TENANT_ADMIN_NAME is required");
  if (!DEMO_TENANT_ADMIN_EMAIL || !EMAIL_PATTERN.test(DEMO_TENANT_ADMIN_EMAIL)) {
    fail("DEMO_TENANT_ADMIN_EMAIL is required and must be a valid email");
  }
  if (!DEMO_TENANT_ADMIN_PASSWORD) fail("DEMO_TENANT_ADMIN_PASSWORD is required");

  const policy = checkPasswordPolicy(DEMO_TENANT_ADMIN_PASSWORD);
  if (!policy.valid) fail(`password rejected by policy: ${policy.issues.join("; ")}`);

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  try {
    const existingTenant = await TenantModel.findOne({ slug: DEMO_TENANT_SLUG }).lean();
    if (existingTenant) fail(`tenant "${DEMO_TENANT_SLUG}" already exists`);

    const existingUser = await UserModel.findOne({
      email: DEMO_TENANT_ADMIN_EMAIL.trim().toLowerCase(),
    }).lean();
    if (existingUser) fail(`a user with that email already exists`);

    const tenant = await TenantModel.create({
      companyName: DEMO_TENANT_COMPANY.trim(),
      slug: DEMO_TENANT_SLUG.trim().toLowerCase(),
      status: "ACTIVE",
      contact: {},
    });

    const passwordHash = await hashPassword(DEMO_TENANT_ADMIN_PASSWORD);
    await UserModel.create({
      name: DEMO_TENANT_ADMIN_NAME.trim(),
      email: DEMO_TENANT_ADMIN_EMAIL.trim().toLowerCase(),
      passwordHash,
      role: "TENANT_ADMIN",
      tenantId: tenant._id,
      status: "ACTIVE",
    });

    console.log(
      `seed-demo-tenant: tenant "${tenant.slug}" + its Tenant Admin created.`,
    );
    console.log(
      "seed-demo-tenant: to verify suspension behavior → " +
        `db.tenants.updateOne({slug:"${tenant.slug}"},{$set:{status:"SUSPENDED"}})`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

await main();
