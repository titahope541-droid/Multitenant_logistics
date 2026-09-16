"use client";

/**
 * Admin LocationPicker — search (debounced) → select → marker → refine by
 * map click or marker drag → reverse-geocoded name → explicit CONFIRM.
 *
 * Nothing persists before confirmation: one confirmed update equals one
 * location-history row and one realtime broadcast.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Loader2, MapPin, Search, X } from "lucide-react";
import { Button, ErrorNote, Field, Input, Mono } from "@/components/ui";
import { ApiClientError } from "@/services/api-client";
import { reverseLookup, searchLocations, type GeocodingResultDto } from "@/services/geocoding";
import type { MapPosition } from "@/components/maps/leaflet-map";
import type { CurrentLocationDto } from "@/types/package";

const LeafletMap = dynamic(
  () => import("@/components/maps/leaflet-map").then((mod) => mod.LeafletMap),
  { ssr: false, loading: () => <div className="h-64 w-full animate-pulse rounded-lg bg-surface-2 sm:h-80" /> },
);

const DEFAULT_CENTER: MapPosition = { lat: 20, lng: 10 };

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

  /* Debounced search: 400 ms after typing stops, never twice for the same
     query, never for empties. */
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

  /* Reverse-name the chosen coordinates; failure keeps the coordinates and
     leaves the name editable (graceful degradation). */
  const resolveName = useCallback(async (pos: MapPosition) => {
    setNaming(true);
    try {
      const { result } = await reverseLookup(pos.lat, pos.lng);
      if (result) setLocationName(result.displayName);
    } catch {
      /* coordinates remain valid without a resolved name */
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

  function selectResult(result: GeocodingResultDto): void {
    setPosition({ lat: result.latitude, lng: result.longitude });
    setLocationName(result.displayName);
    setResults([]);
    setSearchedOnce(false);
    setQuery(result.displayName.split(",")[0] ?? result.displayName);
    setError(null);
  }

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
      {/* Search */}
      <div>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a city, area or address…"
            aria-label="Search location"
            className="px-10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-muted transition-colors hover:text-slate"
            >
              <span className="sr-only">Clear search</span>
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {searching ? (
          <p className="mt-2 flex items-center gap-2 text-[12.5px] text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Searching…
          </p>
        ) : null}
        {searchError ? (
          <p role="alert" className="mt-2 text-[12.5px] text-danger">
            {searchError}
          </p>
        ) : null}

        {results.length > 0 ? (
          <ul
            className="mt-2 divide-y divide-hair overflow-hidden rounded-lg border border-hair"
            role="listbox"
            aria-label="Search results"
          >
            {results.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => selectResult(result)}
                  className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span className="text-[13px] leading-5 text-slate">{result.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : searchedOnce && !searching && query.trim().length >= 2 ? (
          <p className="mt-2 text-[12.5px] text-muted">No matching places — try a broader search.</p>
        ) : null}
      </div>

      {/* Map */}
      {mapFailed ? (
        <div className="rounded-lg border border-dashed border-hair-strong px-4 py-8 text-center text-[13px] text-muted">
          Map tiles could not load. Search above still works, and coordinates below remain valid —
          tracking is unaffected.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg">
          <LeafletMap
            center={center}
            zoom={position ? 13 : 2}
            marker={position ? { ...position, label: locationName || "selected location" } : null}
            interactive
            draggableMarker
            onPick={onPick}
            onMarkerDragEnd={onPick}
            onFailure={() => setMapFailed(true)}
          />
        </div>
      )}
      <p className="text-[12px] text-muted">
        Click the map or drag the marker to refine. © OpenStreetMap contributors.
      </p>

      {/* Confirmation */}
      <form onSubmit={confirm} className="space-y-4 border-t border-hair pt-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-surface-2 px-3.5 py-3 text-[13px]">
            <p className="text-[12px] text-muted">Selected coordinates</p>
            <p className="mt-1 text-slate">
              <Mono>
                {position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : "— , —"}
              </Mono>
            </p>
          </div>
          <Field
            label="Location name"
            htmlFor="location-name"
            hint={naming ? "Resolving name…" : "Shown to the customer."}
          >
            <Input
              id="location-name"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              placeholder="e.g. Bamenda — Mile 4"
            />
          </Field>
        </div>

        {error ? <ErrorNote>{error}</ErrorNote> : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={!position || parentBusy}
            loading={confirming}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Confirm location
          </Button>
          <p className="text-[12px] text-muted">
            One confirmed update = one history entry + a live customer update.
          </p>
        </div>
      </form>
    </div>
  );
}
