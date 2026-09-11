/**
 * Session model — server-side session records for cookie authentication.
 * IMPLEMENTED IN PHASE 3.
 *
 * Architectural note: this is an INFRASTRUCTURE collection, not a business
 * collection — the six locked business collections are unchanged
 * (docs/database.md). The locked Phase-3 architecture mandates a
 * MongoDB-compatible server-side session store (no Redis, no JWT-in-browser).
 *
 * Security properties:
 *   · only the SHA-256 hash of the bearer token is stored (unique)
 *   · role/tenantId are stored as a snapshot for fast context resolution,
 *     and are ALWAYS re-validated against the live user/tenant per request
 *   · TTL index on expiresAt physically removes dead sessions
 */

import { Schema, model, models, type Model, type Types } from "mongoose";
import { USER_ROLES, type UserRole } from "@/types/domain";

export interface SessionDocument {
  /** SHA-256 hex of the cookie bearer token (raw token never persisted). */
  tokenHash: string;
  userId: Types.ObjectId;
  role: UserRole;
  tenantId: Types.ObjectId | null;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
}

const sessionSchema = new Schema<SessionDocument>(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, required: true, enum: { values: [...USER_ROLES] } },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", default: null },
    userAgent: { type: String, maxlength: 300 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "sessions" },
);

/* Expired sessions are physically deleted by MongoDB's TTL monitor. */
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
/* Password-change invalidation and "who is online" queries. */
sessionSchema.index({ userId: 1 });

export const SessionModel: Model<SessionDocument> =
  (models.Session as Model<SessionDocument> | undefined) ??
  model<SessionDocument>("Session", sessionSchema);
