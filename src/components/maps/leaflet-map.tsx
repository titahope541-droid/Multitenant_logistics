"use client";

/**
 * Shared Leaflet core — the ONE map-primitive every surface reuses.
 * Client-only (Leaflet needs the DOM); parents import it through
 * next/dynamic with ssr:false. Brand-aware pin via CSS variable.
 *
 * Fail-safe contract: any init/tile failurereports through onFailure
 * so callers can render the textual fallback — maps never break tracking.
 */

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapPosition {
  lat: number;
  lng: number;
}

/** OpenStreetMap-ecosystem raster tiles — configurable via env (public
 *  URL by nature). Honor the selected provider's usage policy. */
const TILE_URL =
  process.env.NEXT_PUBLIC_OSM_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: "meridian-map-pin",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export function LeafletMap({
  center,
  zoom = 13,
  marker,
  interactive = true,
  draggableMarker = false,
  onPick,
  onMarkerDragEnd,
  onFailure,
}: {
  center: MapPosition;
  zoom?: number;
  marker: (MapPosition & { label?: string }) | null;
  interactive?: boolean;
  draggableMarker?: boolean;
  onPick?: (position: MapPosition) => void;
  onMarkerDragEnd?: (position: MapPosition) => void;
  onFailure?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const failedRef = useRef(false);
  /* callbacks held in refs so map wiring stays stable across renders —
     updated inside an effect, never during render */
  const onPickRef = useRef(onPick);
  const onMarkerDragEndRef = useRef(onMarkerDragEnd);
  const draggableRef = useRef(draggableMarker);

  useEffect(() => {
    onPickRef.current = onPick;
    onMarkerDragEndRef.current = onMarkerDragEnd;
    draggableRef.current = draggableMarker;
  }, [onPick, onMarkerDragEnd, draggableMarker]);

  function fail(): void {
    if (failedRef.current) return;
    failedRef.current = true;
    onFailure?.();
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    try {
      const map = L.map(container, {
        center: [center.lat, center.lng],
        zoom,
        dragging: interactive,
        scrollWheelZoom: interactive,
        zoomControl: false,
        attributionControl: true,
      });
      L.control.zoom({ position: "topright" }).addTo(map);
      const tiles = L.tileLayer(TILE_URL, {
        maxZoom: 19,
        attribution: TILE_ATTRIBUTION,
      });
      tiles.on("tileerror", fail);
      tiles.addTo(map);
      map.on("click", (event: L.LeafletMouseEvent) => {
        if (!interactive || !onPickRef.current) return;
        onPickRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
      });
      mapRef.current = map;
      // containers resize when panels mount — nudge Leaflet
      setTimeout(() => map.invalidateSize(), 60);
    } catch {
      fail();
    }
    // init once; position/marker are updated by the sibling effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.lat, center.lng], center.lat === 0 && center.lng === 0 ? 2 : map.getZoom());
  }, [center.lat, center.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!marker) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }
    if (!markerRef.current) {
      markerRef.current = L.marker([marker.lat, marker.lng], {
        icon: pinIcon(),
        draggable: draggableRef.current,
        keyboard: true,
        title: marker.label ?? "package location",
      });
      markerRef.current.on("dragend", () => {
        const point = markerRef.current?.getLatLng();
        if (point && onMarkerDragEndRef.current) {
          onMarkerDragEndRef.current({ lat: point.lat, lng: point.lng });
        }
      });
      markerRef.current.addTo(map);
    } else {
      markerRef.current.setLatLng([marker.lat, marker.lng]);
      if (markerRef.current.dragging) {
        if (draggableRef.current) markerRef.current.dragging.enable();
        else markerRef.current.dragging.disable();
      }
    }
    if (marker.label) markerRef.current.bindTooltip(marker.label);
  }, [marker]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (interactive) {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
    } else {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
    }
  }, [interactive]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Map"
      className="h-64 w-full overflow-hidden border border-black/10 sm:h-80"
    />
  );
}
