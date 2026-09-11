/**
 * Package model — one shipment. Tenant-owned. IMPLEMENTED IN PHASE 2.
 *
 * Locked modeling decisions honoured here:
 *   · status is EXACTLY the five locked statuses — no sixth, ever
 *   · there is NO Customer entity: sender/receiver are embedded subdocuments
 *   · paymentMethod is FREE TEXT (no payment-method enum exists)
 *   · currentLocation is a cached latest fix, separate from LocationHistory
 *   · trackingId is globally unique; it will be SERVER-GENERATED in Phase 5
 *     (tenant admins never type one) — the model guarantees uniqueness only
 *   · archived is a soft-remove flag for tenant lists, not a status
 */

import { Schema, model, models, type Model, type Types } from "mongoose";
import { EMAIL_PATTERN } from "@/lib/validation-patterns";
import {
  PACKAGE_STATUSES,
  PAYMENT_STATUSES,
  type PackageStatus,
  type PaymentStatus,
} from "@/types/domain";

/* ── Embedded shapes ─────────────────────────────────────────────────────── */

export interface PartyDetails {
  name: string;
  phone: string;
  email?: string;
  address: string;
}

export interface PackageSpecifications {
  /** Free-form size descriptor, e.g. "medium carton" — no dimension enum. */
  size?: string;
  /** Weight in kilograms. */
  weight?: number;
}

export interface PackagePayment {
  /** FREE TEXT by locked decision — never enum-constrained. */
  paymentMethod?: string;
  paymentStatus: PaymentStatus;
  /** In the tenant's operating currency (V1 stores the amount only). */
  shippingCost: number;
}

export interface PackageDelivery {
  estimatedDeliveryDate?: Date;
}

export interface PackageCurrentLocation {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  updatedAt?: Date;
}

export interface PackageDocument {
  tenantId: Types.ObjectId;
  trackingId: string;
  packageName: string;
  description?: string;
  status: PackageStatus;
  sender: PartyDetails;
  receiver: PartyDetails;
  specifications: PackageSpecifications;
  payment: PackagePayment;
  delivery: PackageDelivery;
  currentLocation?: PackageCurrentLocation;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/* ── Embedded schemas (no independent identity → _id: false) ─────────────── */

const partySchema = new Schema<PartyDetails>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [EMAIL_PATTERN, "party email must be a valid email address"],
    },
    address: { type: String, required: true, trim: true, maxlength: 300 },
  },
  { _id: false },
);

const specificationsSchema = new Schema<PackageSpecifications>(
  {
    size: { type: String, trim: true, maxlength: 60 },
    weight: { type: Number, min: 0, max: 100_000 },
  },
  { _id: false },
);

const paymentSchema = new Schema<PackagePayment>(
  {
    paymentMethod: { type: String, trim: true, maxlength: 80 },
    paymentStatus: {
      type: String,
      enum: { values: [...PAYMENT_STATUSES] },
      default: "UNPAID",
    },
    shippingCost: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const deliverySchema = new Schema<PackageDelivery>(
  {
    estimatedDeliveryDate: { type: Date },
  },
  { _id: false },
);

const currentLocationSchema = new Schema<PackageCurrentLocation>(
  {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    locationName: { type: String, trim: true, maxlength: 200 },
    updatedAt: { type: Date },
  },
  { _id: false },
);

/* ── Package schema ──────────────────────────────────────────────────────── */

const packageSchema = new Schema<PackageDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true, // tenant ownership is mandatory — isolation key
    },
    trackingId: {
      type: String,
      required: true,
      unique: true, // → unique index: GLOBALLY unique across the platform
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 64,
    },
    packageName: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: { values: [...PACKAGE_STATUSES] },
      default: "PENDING",
    },
    sender: { type: partySchema, required: true },
    receiver: { type: partySchema, required: true },
    specifications: { type: specificationsSchema, default: () => ({}) },
    payment: { type: paymentSchema, default: () => ({}) },
    delivery: { type: deliverySchema, default: () => ({}) },
    currentLocation: { type: currentLocationSchema, default: undefined },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "packages" },
);

/* ── Indexes (docs/database.md §indexes — each has a stated consumer) ────── */

/* Tenant-scoped tracking fetch: public lookup filters by tenant + id.      */
packageSchema.index({ tenantId: 1, trackingId: 1 });
/* Tenant admin work queues by lifecycle state.                            */
packageSchema.index({ tenantId: 1, status: 1 });
/* Tenant admin "newest first" package lists.                              */
packageSchema.index({ tenantId: 1, createdAt: -1 });
/* Archive filtering on every tenant list.                                 */
packageSchema.index({ tenantId: 1, archived: 1 });

export const PackageModel: Model<PackageDocument> =
  (models.Package as Model<PackageDocument> | undefined) ??
  model<PackageDocument>("Package", packageSchema);
