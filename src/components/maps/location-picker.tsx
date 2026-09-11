"use client";

/**
 * Admin LocationPicker — the location workflow from docs/maps.md §3:
 * search (debounced) → select → marker → click/drag refinement → reverse
 * lookup → CONFIRM (nothing persists before confirmation; exactly one
 * location_history row per confirmed update).
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Loader2, MapPin, Search, X } from "lucide-react";
import { ApiClientError } from "@/services/api-client";
import { reverseLookup, searchLocations, type GeocodingResultDto } from "@/services/geocoding";
import type { CurrentLocationDto } from "@/types/package";
import type { MapPosition } from "@/components/maps/leaflet-map";

const LeafletMap = dynamic(() => import("@/components/maps/leaflet-map").then((mod) => mod.LeafletMap), {
  ssr: false,
});

const inputClass =
  "w-full border border-line bg-ink px-3.5 py-2.5 text-sm text-paper outline-none transition-colors placeholder:text-dim/60 focus:border-signal";
const labelClass = "mb-1.5 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase";

const DEFAULT_CENTER: MapPosition = { lat: 20, lng: 10 }; // neutral world view

export function LocationPicker({
  initial,
  busy: parentBusy,
  onConfirm,
}: {
  initial: CurrentLocationDto | null;
  busy: boolean;
  onConfirm: (input: { latitude: number; longitude: number; locationName?: string }) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResultDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [position, setPosition] = useState<MapPosition | null>(
    initial ? { lat: initial.latitude, lng: initial.longitude } : null,
  );
  const [locationName, setLocationName] = useState(initial?.locationName ?? "");
  const [naming, setNaming] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastQuery = useRef("");

  const center: MapPosition = position ?? DEFAULT_CENTER;

  /* ── Debounced search: fires 400ms after typing stops, never twice for
       the same query, never for empties (docs/maps.md §debouncing). */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchedOnce(false);
      return;
    }
    const timer = setTimeout(async () => {
      if (lastQuery.current === q) return;
      lastQuery.current = q;
      setSearching(true);
      setSearchError(null);
      try {
        const { results: found } = await searchLocations(q);
        setResults(found);
        setSearchedOnce(true);
      } catch (cause) {
        setResults([]);
        setSearchError(cause instanceof ApiClientError ? cause.message : "Search failed.");
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  function selectResult(result: GeocodingResultDto): void {
    setPosition({ lat: result.latitude, lng: result.longitude });
    setLocationName(result.displayName);
    setResults([]);
    setSearchedOnce(false);
    setQuery(result.displayName.split(",")[0] ?? result.displayName);
    setError(null);
  }

  /* ── Reverse-name the chosen coordinates; failure keeps coordinates and
       leaves the manual name input usable (graceful degradation). */
  const resolveName = useCallback(async (pos: MapPosition) => {
    setNaming(true);
    try {
      const { result } = await reverseLookup(pos.lat, pos.lng);
      if (result) setLocationName(result.displayName);
    } catch {
      /* coordinates remain valid without a name */
    } finally {
      setNaming(false);
    }
  }, []);

  const onPick = useCallback(
    (pos: MapPosition) => {
      setPosition(pos);
      setError(null);
      void resolveName(pos);
    },
    [resolveName],
  );

  async function confirm(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!position || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      await onConfirm({
        latitude: position.lat,
        longitude: position.lng,
        ...(locationName.trim() ? { locationName: locationName.trim() } : {}),
      });
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Unexpected error.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* search */}
      <div>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a city, area, or address…"
            aria-label="Search location"
            className={`${inputClass} pr-9 pl-9`}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-dim hover:text-paper"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        {searching ? (
          <p className="mt-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.15em] text-dim uppercase">
            <Loader2 className="h-3 w-3 animate-spin" /> Searching
          </p>
        ) : null}
        {searchError ? (
          <p role="alert" className="mt-2 font-mono text-[10.5px] text-crimson">{searchError}</p>
        ) : null}
        {results.length > 0 ? (
          <ul className="mt-2 divide-y divide-line border border-line bg-ink" role="listbox" aria-label="Search results">
            {results.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => selectResult(result)}
                  className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-panel"
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" />
                  <span className="text-[12.5px] leading-5 text-paper">{result.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : searchedOnce && !searching && query.trim().length >= 2 ? (
          <p className="mt-2 font-mono text-[10.5px] text-dim">No matching places — try a broader search.</p>
        ) : null}
      </div>

      {/* map */}
      {mapFailed ? (
        <div className="border border-dashed border-line-strong px-4 py-8 text-center font-mono text-[11px] text-dim">
          Map tiles could not be loaded — you can still search above, or
          set coordinates after a result is chosen. Tracking data is unaffected.
        </div>
      ) : (
        <LeafletMap
          center={center}
          zoom={position ? 13 : 2}
          marker={
            position
              ? { ...position, label: locationName || "selected location" }
              : null
          }
          interactive
          draggableMarker
          onPick={onPick}
          onMarkerDragEnd={onPick}
          onFailure={() => setMapFailed(true)}
        />
      )}
      <p className="font-mono text-[10px] leading-4 text-dim">
        Click the map or drag the marker to refine. © OpenStreetMap contributors.
      </p>

      {/* confirmation */}
      <form onSubmit={confirm} className="space-y-3 border-t border-line pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="font-mono text-[11px] leading-5 text-fog">
            <span className="text-dim">LAT</span> {position ? position.lat.toFixed(5) : "—"}
            <br />
            <span className="text-dim">LNG</span> {position ? position.lng.toFixed(5) : "—"}
          </p>
          <label className="block">
            <span className={labelClass}>Location name {naming ? "(resolving…)" : ""}</span>
            <input
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              placeholder="e.g. Bamenda — Mile 4"
              className={inputClass}
            />
          </label>
        </div>
        {error ? (
          <p role="alert" className="border-l-2 border-crimson px-3 py-2 font-mono text-[11px] text-crimson">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={!position || confirming || parentBusy}
          className="inline-flex items-center gap-2 border border-paper/25 bg-paper px-4 py-2.5 font-mono text-[10px] font-medium tracking-[0.18em] text-ink uppercase transition-colors hover:border-signal hover:bg-signal disabled:opacity-50"
        >
          {confirming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Confirm location update
        </button>
        <p className="font-mono text-[9.5px] leading-4 text-dim">
          Nothing is saved until you confirm. One confirmed update = one
          location-history entry + a live broadcast to tracking pages.
        </p>
      </form>
    </div>
  );
}
