"use client";

/**
 * useTrackingRealtime — subscribes the public tracking page to one
 * package's live events. Contract (docs/realtime.md):
 *
 *   REST snapshot renders first (database is truth)
 *   → socket subscribes (server authorizes the join)
 *   → broadcasts merge into local state
 *   → disconnect shows a subtle reconnecting state
 *   → RECONNECT triggers a REST REFETCH (missed events can't be assumed)
 *   → unmount/trackingId change removes every listener + room
 */

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { createRealtimeSocket } from "@/services/realtime";
import type { PublicTrackingResult } from "@/types/domain";
import type {
  PublicLocationUpdatedPayload,
  PublicStatusUpdatedPayload,
} from "@/types/realtime";

const EVENTS = {
  subscribe: "package:subscribe",
  statusUpdated: "tracking:status.updated",
  locationUpdated: "tracking:location.updated",
} as const;

export type RealtimeStatus = "idle" | "connecting" | "live" | "reconnecting";

export function useTrackingRealtime(
  trackingId: string | null,
  onEvent: (patch: (current: PublicTrackingResult) => PublicTrackingResult) => void,
  resync: (trackingId: string) => void,
): RealtimeStatus {
  /* Signal is DERIVED (idle is computed from trackingId) — socket
     callbacks update it asynchronously, never synchronously in effects. */
  const [signal, setSignal] = useState<"connecting" | "live" | "reconnecting">("connecting");
  const onEventRef = useRef(onEvent);
  const resyncRef = useRef(resync);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    onEventRef.current = onEvent;
    resyncRef.current = resync;
  }, [onEvent, resync]);

  useEffect(() => {
    if (!trackingId) return;
    const id = trackingId;
    const socket = createRealtimeSocket();
    socketRef.current = socket;

    function applyStatus(payload: PublicStatusUpdatedPayload): void {
      if (payload.trackingId !== id) return;
      onEventRef.current((current) => ({
        ...current,
        status: payload.status,
        lastUpdated: payload.occurredAt,
        timeline: [
          ...current.timeline,
          {
            status: payload.status,
            ...(payload.note ? { note: payload.note } : {}),
            occurredAt: payload.occurredAt,
          },
        ],
      }));
    }

    function applyLocation(payload: PublicLocationUpdatedPayload): void {
      if (payload.trackingId !== id) return;
      onEventRef.current((current) => ({
        ...current,
        lastUpdated: payload.recordedAt,
        currentLocation: {
          latitude: payload.location.latitude,
          longitude: payload.location.longitude,
          ...(payload.location.locationName ? { locationName: payload.location.locationName } : {}),
          updatedAt: payload.recordedAt,
        },
      }));
    }

    function onConnect(): void {
      setSignal("live");
      // (Re)subscribe joins the authorized room; then REST-resync — a
      // reconnect can never assume missed broadcasts (doc §reconnect).
      socket.emit(EVENTS.subscribe, { trackingId: id });
      resyncRef.current(id);
    }

    socket.on("connect", onConnect);
    socket.on(EVENTS.statusUpdated, applyStatus);
    socket.on(EVENTS.locationUpdated, applyLocation);
    socket.io.on("reconnect_attempt", () => setSignal("reconnecting"));
    socket.io.on("error", () => setSignal("reconnecting"));

    return () => {
      // exact mirrored teardown — no orphaned listeners between packages
      socket.off("connect", onConnect);
      socket.off(EVENTS.statusUpdated, applyStatus);
      socket.off(EVENTS.locationUpdated, applyLocation);
      socket.io.off("reconnect_attempt");
      socket.io.off("error");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [trackingId]);

  return trackingId ? signal : "idle";
}
