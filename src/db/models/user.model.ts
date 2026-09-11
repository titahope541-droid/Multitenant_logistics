/**
 * User model — the ONLY account-holders on the platform:
 * Platform Admins and Tenant Admins. IMPLEMENTED IN PHASE 2.
 *
 * Locked rules enforced at the data layer:
 *   · roles are exactly PLATFORM_ADMIN / TENANT_ADMIN — nothing else
 *   · PLATFORM_ADMIN → tenantId is null; TENANT_ADMIN → tenantId required
 *   · exactly ONE platform admin account            (partial unique index)
 *   · exactly ONE tenant admin per tenant           (partial unique index)
 *   · passwords exist only as `passwordHash`, selected out of all queries
 *     by default so it can never leak into an API payload
 *
 * There is deliberately NO Customer anything here. Authentication flows
 * (hashing, sessions) arrive in Phase 3 — this phase defines the model.
 */

import { Schema, model, models, type Model, type Types } from "mongoose";
import { EMAIL_PATTERN } from "@/lib/validation-patterns";
import {
  USER_ROLES,
  USER_STATUSES,
  type UserRole,
  type UserStatus,
} from "@/types/domain";

export interface UserDocument {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  /** Null for PLATFORM_ADMIN; the owning tenant for TENANT_ADMIN. */
  tenantId: Types.ObjectId | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true, // → unique index; the login identity
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [EMAIL_PATTERN, "email must be a valid email address"],
    },
    passwordHash: {
      type: String,
      required: true,
      // Never returned by queries unless explicitly selected — the hash is
      // authentication material, not display data.
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: { values: [...USER_ROLES] },
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },
    status: {
      type: String,
      enum: { values: [...USER_STATUSES] },
      default: "ACTIVE",
    },
  },
  { timestamps: true, collection: "users" },
);

/* Cross-field data rule: role decides whether a tenant binding is legal. */
userSchema.pre("validate", async function () {
  const doc = this as unknown as UserDocument;
  if (doc.role === "PLATFORM_ADMIN" && doc.tenantId !== null) {
    throw new Error("A PLATFORM_ADMIN must not belong to a tenant (tenantId must be null).");
  }
  if (doc.role === "TENANT_ADMIN" && doc.tenantId === null) {
    throw new Error("A TENANT_ADMIN must belong to a tenant (tenantId is required).");
  }
});

/* Query support: tenant membership listings and role filtering. */
userSchema.index({ tenantId: 1 });
userSchema.index({ role: 1 });

/* Locked cardinality, enforced by the database instead of hope:
   exactly one PLATFORM_ADMIN account in the whole platform… */
userSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: { role: "PLATFORM_ADMIN" },
    name: "one_platform_admin",
  },
);
/* …and exactly one TENANT_ADMIN account per tenant. */
userSchema.index(
  { tenantId: 1 },
  {
    unique: true,
    partialFilterExpression: { role: "TENANT_ADMIN" },
    name: "one_tenant_admin_per_tenant",
  },
);

export const UserModel: Model<UserDocument> =
  (models.User as Model<UserDocument> | undefined) ??
  model<UserDocument>("User", userSchema);
