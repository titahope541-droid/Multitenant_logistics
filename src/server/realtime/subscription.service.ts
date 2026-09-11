/**
 * Subscription authorization — the door EVERY room join passes through.
 *
 * Public subscriptions repeat the public-tracking checks (same rules as
 * the REST endpoint): tenant resolved from the socket's Host and ACTIVE,
 * tracking ID well-formed, package exists under THAT tenant, and not
 * archived. Knowing a MongoDB _id grants nothing — subscription is keyed
 * by trackingId only (tests/realtime-subscription... test file asserts it).
 */

import mongoose from "mongoose";
import { PackageModel, type PackageDocument } from "@/db/models/package.model";
import { apiErrors } from "@/server/http/errors";
import { getLogger } from "@/server/utils/logger";
import { TRACKING_ID_PARAM_PATTERN } from "@/lib/validation-patterns";
import type { Document } from "mongoose";
import type { ResolvedTenant } from "@/server/services/tenant-resolution.service";

const log = getLogger("realtime");

const NOT_FOUND = "Package could not be found.";

export async function authorizeTrackingSubscription(
  tenant: ResolvedTenant,
  trackingId: string,
): Promise<(Document & PackageDocument & { _id: mongoose.Types.ObjectId })> {
  if (tenant.status === "SUSPENDED") throw apiErrors.tenantSuspended();
  if (tenant.status === "ARCHIVED") throw apiErrors.tenantArchived();

  const id = trackingId.trim().toUpperCase();
  if (!TRACKING_ID_PARAM_PATTERN.test(id)) {
    throw apiErrors.validation("Invalid tracking ID format.");
  }

  const pkg = await PackageModel.findOne({
    tenantId: new mongoose.Types.ObjectId(tenant.id),
    trackingId: { $eq: id },
  });

  if (!pkg || pkg.archived) {
    log.info({ tenant: tenant.slug }, "subscription rejected — package not trackable");
    throw apiErrors.packageNotFound(NOT_FOUND);
  }
  return pkg;
}
