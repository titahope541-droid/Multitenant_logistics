/**
 * LocationHistory model — the append-only geographic trail of a package.
 * IMPLEMENTED IN PHASE 2.
 *
 * Why this is separate from packages.currentLocation: the current location
 * is a cached latest fix that gets overwritten; history is the full trail
 * and must never be overwritten. This collection is designed for high
 * write volume (dozens of telemetry fixes per package vs ≤ 5 status
 * events), which is also why it is NOT the same collection as
 * status_events.
 *
 * Not exposed to customers — the public projection comes in a later phase.
 */

import { Schema, model, models, type Model, type Types } from "mongoose";

export interface LocationHistoryDocument {
  tenantId: Types.ObjectId;
  packageId: Types.ObjectId;
  latitude: number;
  longitude: number;
  /** Optional human label, e.g. "Distribution Center — Lagos". */
  locationName?: string;
  createdAt: Date;
}

const locationHistorySchema = new Schema<LocationHistoryDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true, // isolation key
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    locationName: { type: String, trim: true, maxlength: 200 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "location_history",
  },
);

/* Trail rendering + "latest position" for a package, newest first.         */
locationHistorySchema.index({ packageId: 1, createdAt: -1 });
/* Tenant-scoped history queries.                                            */
locationHistorySchema.index({ tenantId: 1, packageId: 1 });

export const LocationHistoryModel: Model<LocationHistoryDocument> =
  (models.LocationHistory as Model<LocationHistoryDocument> | undefined) ??
  model<LocationHistoryDocument>("LocationHistory", locationHistorySchema);
