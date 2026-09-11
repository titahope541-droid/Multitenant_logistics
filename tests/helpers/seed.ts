/**
 * Test seeding helpers — create tenants/users/sessions directly through
 * the real Mongoose models so schema validation participates in tests.
 */

import type { HydratedDocument, Types } from "mongoose";
import { SessionModel, type SessionDocument } from "@/db/models/session.model";
import { TenantModel, type TenantDocument } from "@/db/models/tenant.model";
import { UserModel, type UserDocument } from "@/db/models/user.model";
import { hashPassword } from "@/server/utils/password";
import { generateSessionToken, hashSessionToken } from "@/server/utils/session-token";
import type { TenantStatus, UserRole, UserStatus } from "@/types/domain";

export async function seedTenant(
  overrides: Partial<Pick<TenantDocument, "slug" | "companyName" | "status">> = {},
): Promise<HydratedDocument<TenantDocument>> {
  return TenantModel.create({
    companyName: overrides.companyName ?? "Swift Logistics",
    slug: overrides.slug ?? `tenant-${Math.random().toString(36).slice(2, 8)}`,
    status: (overrides.status ?? "ACTIVE") as TenantStatus,
    contact: {},
  });
}

export const TEST_PASSWORD = "correct-horse-battery";

export async function seedUser(overrides: {
  email?: string;
  role: UserRole;
  tenantId?: Types.ObjectId | null;
  status?: UserStatus;
  password?: string;
  name?: string;
}): Promise<HydratedDocument<UserDocument>> {
  return UserModel.create({
    name: overrides.name ?? "Test Admin",
    email: overrides.email ?? `user-${Math.random().toString(36).slice(2, 8)}@example.com`,
    passwordHash: await hashPassword(overrides.password ?? TEST_PASSWORD),
    role: overrides.role,
    tenantId: overrides.tenantId ?? null,
    status: overrides.status ?? "ACTIVE",
  });
}

export async function seedSession(
  user: HydratedDocument<UserDocument>,
  overrides: { expiresAt?: Date } = {},
): Promise<{ token: string; session: HydratedDocument<SessionDocument> }> {
  const token = generateSessionToken();
  const session = await SessionModel.create({
    tokenHash: hashSessionToken(token),
    userId: user._id,
    role: user.role,
    tenantId: user.tenantId,
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
  });
  return { token, session };
}
