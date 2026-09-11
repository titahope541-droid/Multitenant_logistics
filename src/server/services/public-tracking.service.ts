/**
 * Public tracking service — IMPLEMENTED IN PHASE 6.
 *
 * Unauthenticated by design, and therefore engineered around an explicit
 * allowlist (docs/public-tracking.md):
 *
 *   resolve tenant from hostname → tenant must be ACTIVE
 *     → find package by trackingId AND tenant scope (globally unique id,
 *       still hostname-authoritative — no cross-tenant reads)
 *     → archived packages are invisible (safe 404, like unknown ids)
 *     → project the STRICT allowlist; never a raw document
 *
 * Cross-tenant posture: looking up tenant B's tracking ID on tenant A's
 * host answers 404 — existence elsewhere is not confirmable.
 */

import mongoose from "mongoose";
import { LocationHistoryModel } from "@/db/models/location-history.model";
import { PackageModel } from "@/db/models/package.model";
import { StatusEventModel } from "@/db/models/status-event.model";
import { apiErrors } from "@/server/http/errors";
import { getLogger } from "@/server/utils/logger";
import type { PublicTrackingResult } from "@/types/domain";
import type { ResolvedTenant } from "@/server/services/tenant-resolution.service";

const log = getLogger("public-tracking");

const NOT_FOUND_MESSAGE = "Package not found. Please check your tracking ID and try again.";

export async function getPublicTracking(
  tenant: ResolvedTenant,
  trackingId: string,
): Promise<PublicTrackingResult> {
  if (tenant.status === "SUSPENDED") {
    throw apiErrors.tenantSuspended("Tracking is temporarily unavailable.");
  }
  if (tenant.status === "ARCHIVED") {
    throw apiErrors.tenantArchived("Tracking is temporarily unavailable.");
  }

  const tenantObjectId = new mongoose.Types.ObjectId(tenant.id);
  const normalizedId = trackingId.trim().toUpperCase();

  // Globally unique id, but still scoped: the hostname owns the context.
  const pkg = await PackageModel.findOne({
    tenantId: tenantObjectId,
    trackingId: { $eq: normalizedId },
  }).lean();

  // Unknown id AND archived package share the exact same safe answer.
  if (!pkg || pkg.archived) {
    log.info({ tenant: tenant.slug }, "public tracking miss");
    throw apiErrors.packageNotFound(NOT_FOUND_MESSAGE);
  }

  const tenantIdForEvents = pkg.tenantId;
  const timelineEvents = await StatusEventModel.find({
    tenantId: tenantIdForEvents,
    packageId: pkg._id,
  })
    .sort({ createdAt: 1 })
    .lean();

  // Location history is deliberately NOT read for the public payload —
  // only the cached current location may be customer-visible.
  void LocationHistoryModel;

  const currentLocation =
    pkg.currentLocation?.latitude !== undefined && pkg.currentLocation?.longitude !== undefined
      ? {
          latitude: pkg.currentLocation.latitude,
          longitude: pkg.currentLocation.longitude,
          ...(pkg.currentLocation.locationName
            ? { locationName: pkg.currentLocation.locationName }
            : {}),
          updatedAt: (pkg.currentLocation.updatedAt ?? pkg.updatedAt).toISOString(),
        }
      : null;

  return {
    trackingId: pkg.trackingId,
    packageName: pkg.packageName,
    senderName: pkg.sender?.name ?? "",
    receiverName: pkg.receiver?.name ?? "",
    ...(pkg.delivery?.estimatedDeliveryDate
      ? { estimatedDelivery: pkg.delivery.estimatedDeliveryDate.toISOString() }
      : {}),
    status: pkg.status,
    lastUpdated: pkg.updatedAt.toISOString(),
    currentLocation,
    timeline: timelineEvents.map((event) => ({
      status: event.status,
      ...(event.note ? { note: event.note } : {}),
      occurredAt: event.createdAt.toISOString(),
    })),
  };
}
