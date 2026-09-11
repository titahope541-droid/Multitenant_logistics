/**
 * Package service — ALL tenant-admin package business logic (Phase 5).
 *
 * Tenant isolation is structural: every single query carries
 * `tenantId: auth.user.tenantId`, resolved from the authenticated session
 * (docs/security.md §1). Cross-tenant requests therefore look exactly like
 * "not found" — never "forbidden", never a leak.
 *
 * Multi-document writes run through executeAtomically (real transactions on
 * replica-set/Atlas, sequential+compensation on standalone mongod):
 *   · create  = package + initial PENDING status event (+ first location row)
 *   · status  = packages.status + status_events row
 *   · location= packages.currentLocation + location_history row
 *
 * Later phases consume this same service (public tracking read projection,
 * Socket.IO broadcasts) — no duplicated logic.
 */

import mongoose, { type HydratedDocument } from "mongoose";
import { LocationHistoryModel } from "@/db/models/location-history.model";
import {
  PackageModel,
  type PackageDocument,
  type PartyDetails,
} from "@/db/models/package.model";
import { StatusEventModel } from "@/db/models/status-event.model";
import { TenantModel } from "@/db/models/tenant.model";
import { apiErrors } from "@/server/http/errors";
import type { AuthContext } from "@/server/middleware/auth";
import {
  broadcastPackageLocationChanged,
  broadcastPackageStatusChanged,
} from "@/server/realtime/broadcast";
import * as trackingIds from "@/server/services/tracking-id.service";
import { getLogger } from "@/server/utils/logger";
import { executeAtomically } from "@/server/utils/transaction";
import {
  isPackageStatus,
  PACKAGE_STATUSES,
  type PackageStatus,
} from "@/types/domain";
import type {
  AdminPackageDetails,
  AdminPackageListItem,
  CreatedPackageResult,
  ListPackagesQuery,
  PartyDetailsDto,
} from "@/types/package";
import type { Paginated } from "@/types/tenant";
import type {
  ChangePackageStatusInput,
  CreatePackageInput,
  UpdateLocationInput,
} from "@/server/validators/package.validators";

const log = getLogger("packages");

const PACKAGES_PAGE_LIMIT_DEFAULT = 20;
const TRACKING_ID_MAX_ATTEMPTS = 5;

/* ── Tenant scope (session-authoritative — the ONLY source of tenantId) ──── */

function tenantScope(auth: AuthContext): mongoose.Types.ObjectId {
  if (!auth.user.tenantId) {
    // Should be unreachable for TENANT_ADMIN-gated routes; fail closed.
    throw apiErrors.forbidden("This account is not bound to a tenant.");
  }
  return new mongoose.Types.ObjectId(auth.user.tenantId);
}

/* ── DTO mapping ─────────────────────────────────────────────────────────── */

function toParty(party: PartyDetails): PartyDetailsDto {
  return {
    name: party.name,
    phone: party.phone,
    ...(party.email ? { email: party.email } : {}),
    address: party.address,
  };
}

type LoadedPackage = HydratedDocument<PackageDocument>;

function toDetails(doc: LoadedPackage): Omit<AdminPackageDetails, "statusHistory" | "locationHistory"> {
  return {
    id: String(doc._id),
    trackingId: doc.trackingId,
    packageName: doc.packageName,
    ...(doc.description ? { description: doc.description } : {}),
    status: doc.status,
    archived: doc.archived,
    sender: toParty(doc.sender),
    receiver: toParty(doc.receiver),
    specifications: {
      ...(doc.specifications?.size ? { size: doc.specifications.size } : {}),
      ...(doc.specifications?.weight !== undefined ? { weight: doc.specifications.weight } : {}),
    },
    payment: {
      ...(doc.payment?.paymentMethod ? { paymentMethod: doc.payment.paymentMethod } : {}),
      paymentStatus: doc.payment?.paymentStatus ?? "UNPAID",
      shippingCost: doc.payment?.shippingCost ?? 0,
    },
    delivery: {
      ...(doc.delivery?.estimatedDeliveryDate
        ? { estimatedDeliveryDate: doc.delivery.estimatedDeliveryDate.toISOString() }
        : {}),
    },
    currentLocation: doc.currentLocation?.latitude !== undefined && doc.currentLocation?.longitude !== undefined
      ? {
          latitude: doc.currentLocation.latitude,
          longitude: doc.currentLocation.longitude,
          ...(doc.currentLocation.locationName ? { locationName: doc.currentLocation.locationName } : {}),
          updatedAt: (doc.currentLocation.updatedAt ?? doc.updatedAt).toISOString(),
        }
      : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function decorateWithHistory(
  tenantId: mongoose.Types.ObjectId,
  doc: LoadedPackage,
): Promise<AdminPackageDetails> {
  const [statusHistory, locationHistory] = await Promise.all([
    StatusEventModel.find({ tenantId, packageId: doc._id }).sort({ createdAt: 1 }).lean(),
    LocationHistoryModel.find({ tenantId, packageId: doc._id }).sort({ createdAt: -1 }).limit(100).lean(),
  ]);
  return {
    ...toDetails(doc),
    statusHistory: statusHistory.map((event) => ({
      status: event.status,
      ...(event.note ? { note: event.note } : {}),
      occurredAt: event.createdAt.toISOString(),
    })),
    locationHistory: locationHistory.map((row) => ({
      latitude: row.latitude,
      longitude: row.longitude,
      ...(row.locationName ? { locationName: row.locationName } : {}),
      recordedAt: row.createdAt.toISOString(),
    })),
  };
}

/* ── Creation (package + initial PENDING event, atomically) ──────────────── */

export async function createPackage(
  auth: AuthContext,
  input: CreatePackageInput,
): Promise<CreatedPackageResult> {
  const tenantId = tenantScope(auth);
  const tenant = await TenantModel.findById(tenantId).lean();
  if (!tenant) throw apiErrors.tenantSuspended();

  let lastDuplicateError: unknown = null;

  for (let attempt = 1; attempt <= TRACKING_ID_MAX_ATTEMPTS; attempt += 1) {
    const trackingId = trackingIds.generateTrackingId(tenant.slug);
    // Fast pre-check; the unique index remains the final authority.
    const taken = await PackageModel.exists({ trackingId });
    if (taken) {
      log.warn({ trackingId, attempt }, "tracking id collision (pre-check)");
      continue;
    }

    let createdId: string | null = null;
    try {
      const result = await executeAtomically<string>({
        label: "package.create",
        work: async (session) => {
          const [doc] = await PackageModel.create(
            [
              {
                tenantId,
                trackingId,
                packageName: input.packageName,
                ...(input.description ? { description: input.description } : {}),
                status: "PENDING",
                sender: input.sender,
                receiver: input.receiver,
                specifications: input.specifications ?? {},
                payment: {
                  ...(input.payment?.paymentMethod ? { paymentMethod: input.payment.paymentMethod } : {}),
                  ...(input.payment?.paymentStatus ? { paymentStatus: input.payment.paymentStatus } : {}),
                  ...(input.payment?.shippingCost !== undefined ? { shippingCost: input.payment.shippingCost } : {}),
                },
                delivery: {
                  ...(input.delivery?.estimatedDeliveryDate
                    ? { estimatedDeliveryDate: input.delivery.estimatedDeliveryDate }
                    : {}),
                },
                ...(input.currentLocation
                  ? { currentLocation: { ...input.currentLocation, updatedAt: new Date() } }
                  : {}),
              },
            ],
            session ? { session } : undefined,
          );
          await StatusEventModel.create(
            [
              {
                tenantId,
                packageId: doc._id,
                status: "PENDING",
                note: "Package created.",
              },
            ],
            session ? { session } : undefined,
          );
          if (input.currentLocation) {
            await LocationHistoryModel.create(
              [
                {
                  tenantId,
                  packageId: doc._id,
                  latitude: input.currentLocation.latitude,
                  longitude: input.currentLocation.longitude,
                  ...(input.currentLocation.locationName
                    ? { locationName: input.currentLocation.locationName }
                    : {}),
                },
              ],
              session ? { session } : undefined,
            );
          }
          createdId = String(doc._id);
          return createdId;
        },
        compensate: async () => {
          if (createdId) {
            await PackageModel.deleteOne({ _id: createdId, tenantId }).catch(() => undefined);
          }
        },
      });
      log.info({ tenantId: auth.user.tenantId, trackingId, packageId: result }, "package created");
      const fresh = await PackageModel.findOne({ _id: result, tenantId });
      if (!fresh) throw apiErrors.internal("Package was not persisted as expected.");
      return { package: await decorateWithHistory(tenantId, fresh), trackingId };
    } catch (error) {
      const isDuplicate =
        typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
      if (isDuplicate) {
        lastDuplicateError = error;
        log.warn({ trackingId, attempt }, "tracking id collision (unique index)");
        continue;
      }
      throw error;
    }
  }

  log.error({ err: lastDuplicateError }, "tracking id generation exhausted retries");
  throw apiErrors.trackingIdGenerationFailed();
}

/* ── List (search / status filter / archive drawer / pagination) ─────────── */

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listPackages(
  auth: AuthContext,
  query: ListPackagesQuery,
): Promise<Paginated<AdminPackageListItem>> {
  const tenantId = tenantScope(auth);
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(1, query.limit ?? PACKAGES_PAGE_LIMIT_DEFAULT));

  const filter: Record<string, unknown> = { tenantId };
  // Normal list hides archived by default; archived=true opens the archive drawer.
  filter.archived = query.archived === true ? true : false;
  if (query.status && query.status !== "ALL") filter.status = query.status;
  if (query.search?.trim()) {
    const regex = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [
      { trackingId: regex },
      { packageName: regex },
      { "receiver.name": regex },
      { "sender.name": regex },
    ];
  }

  const [total, rows] = await Promise.all([
    PackageModel.countDocuments(filter),
    PackageModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const items: AdminPackageListItem[] = rows.map((row) => ({
    id: String(row._id),
    trackingId: row.trackingId,
    packageName: row.packageName,
    status: row.status,
    archived: row.archived,
    senderName: row.sender?.name ?? "",
    receiverName: row.receiver?.name ?? "",
    currentLocationName: row.currentLocation?.locationName ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/* ── Scoped load (ownership inside the query — isolation by construction) ── */

async function loadTenantPackage(
  auth: AuthContext,
  packageId: string,
): Promise<LoadedPackage> {
  const tenantId = tenantScope(auth);
  const doc = await PackageModel.findOne({ _id: packageId, tenantId });
  if (!doc) throw apiErrors.packageNotFound();
  return doc;
}

/* ── Details ─────────────────────────────────────────────────────────────── */

export async function getPackageDetails(
  auth: AuthContext,
  packageId: string,
): Promise<AdminPackageDetails> {
  const tenantId = tenantScope(auth);
  const doc = await loadTenantPackage(auth, packageId);
  return decorateWithHistory(tenantId, doc);
}

/* ── Status change (packages.status + status_events row, atomically) ─────── */

export async function changeStatus(
  auth: AuthContext,
  packageId: string,
  input: ChangePackageStatusInput,
): Promise<AdminPackageDetails> {
  const tenantId = tenantScope(auth);
  if (!isPackageStatus(input.status)) {
    // zod already guarantees this at the boundary; defense in depth.
    throw apiErrors.invalidPackageStatus(
      `Status must be one of: ${PACKAGE_STATUSES.join(", ")}.`,
    );
  }
  const status: PackageStatus = input.status;

  const doc = await loadTenantPackage(auth, packageId);
  if (doc.archived) throw apiErrors.packageArchived();

  const occurredAt = new Date();
  await executeAtomically<void>({
    label: "package.changeStatus",
    work: async (session) => {
      await PackageModel.updateOne(
        { _id: doc._id, tenantId },
        { $set: { status } },
        session ? { session } : undefined,
      );
      await StatusEventModel.create(
        [
          {
            tenantId,
            packageId: doc._id,
            status,
            ...(input.note ? { note: input.note } : {}),
            createdAt: occurredAt,
          },
        ],
        session ? { session } : undefined,
      );
    },
  });

  log.info({ packageId, status, tenantId: auth.user.tenantId }, "package status changed");

  // Realtime broadcast AFTER the database committed (docs/realtime.md §4).
  broadcastPackageStatusChanged({
    trackingId: doc.trackingId,
    tenantId: String(tenantId),
    status,
    ...(input.note ? { note: input.note } : {}),
    occurredAt,
  });

  const fresh = await loadTenantPackage(auth, packageId);
  return decorateWithHistory(tenantId, fresh);
}

/* ── Location update (currentLocation + location_history row, atomically) ── */

export async function updateLocation(
  auth: AuthContext,
  packageId: string,
  input: UpdateLocationInput,
): Promise<AdminPackageDetails> {
  const tenantId = tenantScope(auth);
  if (
    input.latitude < -90 || input.latitude > 90 ||
    input.longitude < -180 || input.longitude > 180
  ) {
    throw apiErrors.invalidLocation(); // defense in depth behind zod
  }

  const doc = await loadTenantPackage(auth, packageId);
  if (doc.archived) throw apiErrors.packageArchived();

  const now = new Date();
  await executeAtomically<void>({
    label: "package.updateLocation",
    work: async (session) => {
      await PackageModel.updateOne(
        { _id: doc._id, tenantId },
        {
          $set: {
            "currentLocation.latitude": input.latitude,
            "currentLocation.longitude": input.longitude,
            ...(input.locationName !== undefined
              ? { "currentLocation.locationName": input.locationName }
              : {}),
            "currentLocation.updatedAt": now,
          },
        },
        session ? { session } : undefined,
      );
      await LocationHistoryModel.create(
        [
          {
            tenantId,
            packageId: doc._id,
            latitude: input.latitude,
            longitude: input.longitude,
            ...(input.locationName ? { locationName: input.locationName } : {}),
            createdAt: now,
          },
        ],
        session ? { session } : undefined,
      );
    },
  });

  log.info({ packageId, tenantId: auth.user.tenantId }, "package location updated");

  // Realtime broadcast AFTER the database committed (docs/realtime.md §4).
  broadcastPackageLocationChanged({
    trackingId: doc.trackingId,
    tenantId: String(tenantId),
    location: {
      latitude: input.latitude,
      longitude: input.longitude,
      ...(input.locationName ? { locationName: input.locationName } : {}),
    },
    recordedAt: now,
  });

  const fresh = await loadTenantPackage(auth, packageId);
  return decorateWithHistory(tenantId, fresh);
}

/* ── Archive / restore (soft deletion only — nothing is removed) ─────────── */

export async function setPackageArchived(
  auth: AuthContext,
  packageId: string,
  archived: boolean,
): Promise<AdminPackageDetails> {
  const tenantId = tenantScope(auth);
  const doc = await loadTenantPackage(auth, packageId);
  if (doc.archived === archived) {
    return decorateWithHistory(tenantId, doc); // idempotent
  }
  doc.archived = archived;
  await doc.save();
  log.info({ packageId, archived, tenantId: auth.user.tenantId }, "package archive state changed");
  return decorateWithHistory(tenantId, doc);
}
