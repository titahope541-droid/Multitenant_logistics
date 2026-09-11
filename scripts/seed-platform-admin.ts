/**
 * Seed the single Platform Admin account (development tooling).
 *
 * SECURITY RULES (docs/development.md §seeding):
 *   · credentials come ONLY from environment variables — never hardcoded,
 *     never committed, never printed back out
 *   · refuses to run if a Platform Admin already exists (V1 allows exactly
 *     one) unless invoked with --reset-password to rotate credentials
 *   · enforces the platform password policy
 *
 * Usage:
 *   PLATFORM_ADMIN_NAME="Platform Owner" \
 *   PLATFORM_ADMIN_EMAIL="owner@example.com" \
 *   PLATFORM_ADMIN_PASSWORD="a-long-secret" \
 *   npx tsx scripts/seed-platform-admin.ts
 */

import "dotenv/config";
import mongoose from "mongoose";
import { UserModel } from "../src/db/models/user.model";
import { checkPasswordPolicy, hashPassword } from "../src/server/utils/password";
import { EMAIL_PATTERN } from "../src/lib/validation-patterns";

const { MONGODB_URI, PLATFORM_ADMIN_NAME, PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD } =
  process.env;

function fail(message: string): never {
  console.error(`seed-platform-admin: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  if (!MONGODB_URI) fail("MONGODB_URI is not set (check your .env)");
  if (!PLATFORM_ADMIN_NAME?.trim()) fail("PLATFORM_ADMIN_NAME is required");
  if (!PLATFORM_ADMIN_EMAIL || !EMAIL_PATTERN.test(PLATFORM_ADMIN_EMAIL)) {
    fail("PLATFORM_ADMIN_EMAIL is required and must be a valid email");
  }
  if (!PLATFORM_ADMIN_PASSWORD) fail("PLATFORM_ADMIN_PASSWORD is required");

  const policy = checkPasswordPolicy(PLATFORM_ADMIN_PASSWORD);
  if (!policy.valid) fail(`password rejected by policy: ${policy.issues.join("; ")}`);

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  try {
    const existing = await UserModel.findOne({ role: "PLATFORM_ADMIN" }).lean();
    const reset = process.argv.includes("--reset-password");

    if (existing) {
      if (!reset) {
        fail(
          "a Platform Admin already exists (V1 allows exactly one). " +
            "Re-run with --reset-password to rotate credentials for that account.",
        );
      }
      const passwordHash = await hashPassword(PLATFORM_ADMIN_PASSWORD);
      await UserModel.findByIdAndUpdate(existing._id, { passwordHash });
      console.log("seed-platform-admin: existing Platform Admin password reset.");
      return;
    }

    const passwordHash = await hashPassword(PLATFORM_ADMIN_PASSWORD);
    await UserModel.create({
      name: PLATFORM_ADMIN_NAME.trim(),
      email: PLATFORM_ADMIN_EMAIL.trim().toLowerCase(),
      passwordHash,
      role: "PLATFORM_ADMIN",
      tenantId: null,
      status: "ACTIVE",
    });
    console.log("seed-platform-admin: Platform Admin created (exactly one permitted in V1).");
  } finally {
    await mongoose.disconnect();
  }
}

await main();
