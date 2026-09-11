/**
 * Server-side re-export of the shared realtime contracts.
 *
 * The canonical definitions live in `src/types/realtime.ts` (client-safe);
 * server modules import from here so the boundary convention
 * ("browser code never imports from src/server") stays intact while the
 * protocol has exactly one source of truth.
 */

export {
  REALTIME_EVENTS,
  trackingRoom,
  tenantRoom,
} from "@/types/realtime";
export type {
  RealtimeEventName,
  PackageSubscribePayload,
  PackageSubscribedPayload,
  PackageErrorPayload,
  PublicStatusUpdatedPayload,
  TenantStatusUpdatedPayload,
  PublicLocationUpdatedPayload,
  TenantLocationUpdatedPayload,
} from "@/types/realtime";
