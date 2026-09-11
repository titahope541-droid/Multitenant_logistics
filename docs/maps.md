# Maps

**IMPLEMENTED IN PHASE 7.** Leaflet + the OpenStreetMap ecosystem, behind
abstractions that keep every provider replaceable.

---

## 1 · Provider architecture

```text
Browser/admin UI
   ↓ (debounced, rate-limited)
Backend mediator  /api/v1/admin/geocoding/*
   ↓ GeocodingProvider interface (normalized in/out)
Configured provider (Nominatim by default)
   ↓ provider HTTP

Map surfaces (Leaflet)
   ↓ tile URL (env-configurable)
Tile provider (OSM-ecosystem raster tiles by default)
```

* **Geocoding is backend-mediated** — the browser calls OUR endpoints;
  provider configuration (base URL, user agent, contact) lives in server
  env, never in client bundles.
* **The interface is the contract:** `search(query): GeocodingResult[]`
  and `reverse(lat, lng): GeocodingResult | null` where
  `GeocodingResult = { id, displayName, latitude, longitude }`.
  Provider responses are normalized at the seam — nothing Nominatim-shaped
  travels through the app. A different provider implements this interface
  and nothing else changes.
* Env (`docs/environment.md`): `GEOCODING_BASE_URL` (default the public
  Nominatim host — point it at a self-hosted quota-managed instance for
  production), `GEOCODING_USER_AGENT`, `GEOCODING_CONTACT` (optional,
  forwarded per Nominatim policy), `NEXT_PUBLIC_OSM_TILE_URL` (tiles).

## 2 · Licensing honesty

OpenStreetMap data is free; *usage rules are not unlimited*. The public
Nominatim service enforces a usage policy (≈1 request/second, valid
user-agent, no bulk scraping) and tile operators enforce theirs. This
implementation: debounces searches, rate-limits endpoints server-side,
sends a real user-agent, renders attribution on every map, and avoids
map re-inits. **Production duty (operator):** use a self-hosted or
commercially licensed provider via `GEOCODING_BASE_URL` /
`NEXT_PUBLIC_OSM_TILE_URL`. Self-hosting infrastructure is out of scope.

## 3 · Admin location workflow (implemented)

`LocationPicker` on the package details page:

```text
Search (400ms debounce; never same query twice; empties ignored)
  → selectable normalized results (loading / no-result / provider-error states)
  → marker drops, map recentering
  → CLICK map or DRAG marker (temporary UI position only)
  → reverse geocoding resolves a name (failure → coordinates stay valid,
    name input stays editable — degradation is graceful)
  → admin edits name optionally
  → CONFIRM — the only persistence moment:
        PATCH /admin/packages/:id/location
        → currentLocation updated + location_history row (atomic)
        → realtime broadcast (AFTER the DB write)
```

No write per mouse move; no history spam during drags; one confirmed
update = exactly one history row.

## 4 · Customer map (implemented)

The `/track` result renders `TrackingMap`: one marker at the allowlisted
current location, zoom-only interaction, no search/edit/drag. Marker and
coordinates stay prop-driven — the initial REST snapshot paints it and
realtime location events move it. Coordinates + name + updated time
always render as text too (the map is never the only source).

## 5 · Failure boundaries

Map tiles error or blocked → textual fallback panel (coordinates remain;
tracking is unaffected). Geocoding upstream failure → `502 UPSTREAM_UNAVAILABLE`
with retry-safe messaging; reverse failures are silent-by-design. No
fragment of tracking depends on map success.

## 6 · Next.js compatibility

Leaflet touches the DOM, so interactive maps live in client components
loaded via `next/dynamic({ ssr: false })` — no `window is not defined`,
no full-page SSR opt-out. The pin is a CSS `divIcon` (brand variable),
avoiding Leaflet image-asset URLs entirely. Maps initialize once per
mount (StrictMode-safe) and clean up on unmount.
