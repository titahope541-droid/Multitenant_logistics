/**
 * Broadcast helpers — the ONLY way services emit realtime events.
 *
 * Call order is the architectural guarantee (docs/realtime.md §4):
 * services invoke these AFTER their database write has committed.
 * The helpers never touch the database; they only shape + route payloads.
 *
 *   tracking:{trackingId} room  → public payload (allowlist-safe)
 *   tenant:{tenantId} room      → same envelope + tenantId (admins only)
 */

import {
  REALTIME_EVENTS,
  tenantRoom,
  trackingRoom,
  type PublicLocationUpdatedPayload,
  type PublicStatusUpdatedPayload,
  type TenantLocationUpdatedPayload,
  type TenantStatusUpdatedPayload,
} from "@/server/realtime/events";
import { emitToRoom } from "@/server/realtime/registry";
import type { PackageStatus } from "@/types/domain";

export function broadcastPackageStatusChanged(input: {
  trackingId: string;
  tenantId: string;
  status: PackageStatus;
  note?: string;
  occurredAt: Date;
}): void {
  const occurredAt = input.occurredAt.toISOString();
  const publicPayload: PublicStatusUpdatedPayload = {
    trackingId: input.trackingId,
    status: input.status,
    ...(input.note ? { note: input.note } : {}),
    occurredAt,
  };
  const tenantPayload: TenantStatusUpdatedPayload = { ...publicPayload, tenantId: input.tenantId };
  emitToRoom(trackingRoom(input.trackingId), REALTIME_EVENTS.TRACKING_STATUS_UPDATED, publicPayload);
  emitToRoom(tenantRoom(input.tenantId), REALTIME_EVENTS.TRACKING_STATUS_UPDATED, tenantPayload);
}

export function broadcastPackageLocationChanged(input: {
  trackingId: string;
  tenantId: string;
  location: { latitude: number; longitude: number; locationName?: string };
  recordedAt: Date;
}): void {
  const recordedAt = input.recordedAt.toISOString();
  const publicPayload: PublicLocationUpdatedPayload = {
    trackingId: input.trackingId,
    location: input.location,
    recordedAt,
  };
  const tenantPayload: TenantLocationUpdatedPayload = { ...publicPayload, tenantId: input.tenantId };
  emitToRoom(trackingRoom(input.trackingId), REALTIME_EVENTS.TRACKING_LOCATION_UPDATED, publicPayload);
  emitToRoom(tenantRoom(input.tenantId), REALTIME_EVENTS.TRACKING_LOCATION_UPDATED, tenantPayload);
}
