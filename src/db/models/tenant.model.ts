/**
 * Tenant model — one logistics company on the platform.
 * IMPLEMENTED IN PHASE 2 (docs/database.md §tenants).
 *
 * Holds tenant IDENTITY only: company name, slug, lifecycle status, and the
 * operational contact block. Website/branding configuration deliberately
 * does NOT live here — it belongs to WebsiteConfig (locked separation).
 */

import { Schema, model, models, type Model } from "mongoose";
import { EMAIL_PATTERN, SLUG_PATTERN } from "@/lib/validation-patterns";
import { TENANT_STATUSES, type TenantStatus } from "@/types/domain";

export interface TenantContactDetails {
  phone?: string;
  email?: string;
  address?: string;
}

export interface TenantDocument {
  companyName: string;
  /** Subdomain identifier — `swift.yourplatform.com` → "swift". */
  slug: string;
  status: TenantStatus;
  contact: TenantContactDetails;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<TenantContactDetails>(
  {
    phone: { type: String, trim: true, maxlength: 40 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [EMAIL_PATTERN, "contact.email must be a valid email address"],
    },
    address: { type: String, trim: true, maxlength: 300 },
  },
  { _id: false },
);

const tenantSchema = new Schema<TenantDocument>(
  {
    companyName: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      unique: true, // → unique index; powers subdomain → tenant resolution
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 48,
      match: [SLUG_PATTERN, "slug must be lowercase alphanumeric segments joined by hyphens"],
    },
    status: {
      type: String,
      enum: { values: [...TENANT_STATUSES] },
      default: "ACTIVE",
    },
    contact: { type: contactSchema, default: () => ({}) },
  },
  { timestamps: true, collection: "tenants" },
);

/* Platform admin lists/filter by lifecycle state (Phase 4/9). */
tenantSchema.index({ status: 1 });

export const TenantModel: Model<TenantDocument> =
  (models.Tenant as Model<TenantDocument> | undefined) ??
  model<TenantDocument>("Tenant", tenantSchema);
