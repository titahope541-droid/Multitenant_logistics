/**
 * Realtime contracts — shared Socket.IO types (PURE, client+server safe).
 *
 * Everything the browser and the server need to agree on lives here;
 * `src/server/realtime/events.ts` re-exports it for server consumers.
 * Security rules baked into the shapes: public payloads carry no
 * tenantId (or any internal id); the tenant room gets the tenantId
 * extension instead.
 */

import type { PackageStatus } from "@/types/domain";

/* Event names (broadcast-only protocol; subscriptions are authorized
   server-side — docs/realtime.md) */
export const REALTIME_EVENTS = {
  PACKAGE_SUBSCRIBE: "package:subscribe",
  PACKAGE_SUBSCRIBED: "package:subscribed",
  PACKAGE_ERROR: "package:error",
  TRACKING_STATUS_UPDATED: "tracking:status.updated",
  TRACKING_LOCATION_UPDATED: "tracking:location.updated",
} as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

/* Room topology: public rooms key by trackingId (never Mongo _id);
   tenant rooms exist only for session-authenticated tenant admins. */
export const trackingRoom = (trackingId: string): string => `tracking:${trackingId}`;
export const tenantRoom = (tenantId: string): string => `tenant:${tenantId}`;

export interface PackageSubscribePayload {
  trackingId: string;
}

export interface PackageSubscribedPayload {
  trackingId: string;
}

export interface PackageErrorPayload {
  code: "VALIDATION_ERROR" | "PACKAGE_NOT_FOUND" | "TENANT_SUSPENDED" | "TENANT_ARCHIVED" | "INTERNAL_ERROR";
  message: string;
}

/* Public broadcast payloads — allowlist-safe. */
export interface PublicStatusUpdatedPayload {
  trackingId: string;
  status: PackageStatus;
  note?: string;
  occurredAt: string;
}

export interface TenantStatusUpdatedPayload extends PublicStatusUpdatedPayload {
  tenantId: string;
}

export interface PublicLocationUpdatedPayload {
  trackingId: string;
  location: { latitude: number; longitude: number; locationName?: string };
  recordedAt: string;
}

export interface TenantLocationUpdatedPayload extends PublicLocationUpdatedPayload {
  tenantId: string;
}
