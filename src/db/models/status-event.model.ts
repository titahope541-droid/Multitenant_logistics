/**
 * StatusEvent model — the append-only audit trail of package status
 * changes. IMPLEMENTED IN PHASE 2.
 *
 * Rows here are facts, not state: a status change (Phase 5 workflow) writes
 * one event AND updates packages.status as a cached latest value. Events
 * are never updated or deleted, so the tracking timeline is always
 * reconstructable. `createdAt` is the only timestamp — events don't mutate.
 */

import { Schema, model, models, type Model, type Types } from "mongoose";
import { PACKAGE_STATUSES, type PackageStatus } from "@/types/domain";

export interface StatusEventDocument {
  tenantId: Types.ObjectId;
  packageId: Types.ObjectId;
  status: PackageStatus;
  /** Optional operator note, e.g. "received at origin facility". */
  note?: string;
  createdAt: Date;
}

const statusEventSchema = new Schema<StatusEventDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true, // isolation key — events are tenant-owned too
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: { values: [...PACKAGE_STATUSES] },
    },
    note: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "status_events",
  },
);

/* Timeline rendering for a package, in chronological order.                */
statusEventSchema.index({ packageId: 1, createdAt: 1 });
/* Tenant-scoped event queries never touch other tenants' events.           */
statusEventSchema.index({ tenantId: 1, packageId: 1 });

export const StatusEventModel: Model<StatusEventDocument> =
  (models.StatusEvent as Model<StatusEventDocument> | undefined) ??
  model<StatusEventDocument>("StatusEvent", statusEventSchema);
