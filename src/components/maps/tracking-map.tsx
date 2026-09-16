"use client";

/**
 * Customer TrackingMap — one navigable marker, no search or editing.
 * Marker follows the currentLocation prop (initial REST snapshot and every
 * later realtime event). Falls back to a textual panel when the map cannot
 * render — tracking never depends on tiles.
 */

import dynamic from "next/dynamic";
import { useState } from "react";
import { MapPin } from "lucide-react";
import type { CurrentLocationDto } from "@/types/package";

const LeafletMap = dynamic(() => import("@/components/maps/leaflet-map").then((mod) => mod.LeafletMap), {
  ssr: false,
});

export function TrackingMap({ location }: { location: CurrentLocationDto | null }) {
  const [failed, setFailed] = useState(false);

  if (!location) {
    return (
      <div className="flex h-40 items-center justify-center border border-dashed border-black/20 text-[13px] text-neutral-400">
        No location recorded for this package yet.
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-1 border border-dashed border-black/20 text-neutral-500">
        <MapPin className="h-4 w-4" style={{ color: "var(--brand)" }} />
        <p className="text-[12.5px]">Map could not be loaded — location details are below.</p>
      </div>
    );
  }

  return (
    <LeafletMap
      center={{ lat: location.latitude, lng: location.longitude }}
      zoom={12}
      marker={{ lat: location.latitude, lng: location.longitude, label: location.locationName }}
      interactive
      onFailure={() => setFailed(true)}
    />
  );
}
