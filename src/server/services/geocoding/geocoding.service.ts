/**
 * Geocoding abstraction — the ONLY provider-aware seam in the platform.
 *
 *   Application code → GeocodingProvider interface → configured provider
 *
 * Providers are swappable by configuration (GEOCODING_BASE_URL/
 * GEOCODING_USER_AGENT/GEOCODING_CONTACT env) without touching business
 * logic; a future provider implements this same interface. Normalized
 * results flow everywhere — never raw provider payloads.
 *
 * Backend-mediated on purpose: no provider configuration reaches the
 * browser (docs/security.md). Provider usage policies (1 req/s, proper
 * user-agent for OSM Nominatim) are respected server-side and remain
 * the operator's responsibility in production (docs/maps.md §licensing).
 */

import { apiErrors } from "@/server/http/errors";
import { getServerConfig } from "@/server/config/env";
import { getLogger } from "@/server/utils/logger";

const log = getLogger("geocoding");

/* ── Normalized shapes (provider-agnostic) ───────────────────────────────── */

export interface GeocodingResult {
  id: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

export interface GeocodingProvider {
  search(query: string): Promise<GeocodingResult[]>;
  reverse(latitude: number, longitude: number): Promise<GeocodingResult | null>;
}

/* ── OSM Nominatim provider ──────────────────────────────────────────────── */

interface NominatimSearchRow {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
}

interface NominatimReverseRow {
  place_id: number | string;
  display_name?: string;
}

export class NominatimProvider implements GeocodingProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly userAgent: string,
    private readonly contact: string | null,
  ) {}

  private headers(): Record<string, string> {
    return { "User-Agent": this.userAgent, Accept: "application/json" };
  }

  private contactQuery(): string {
    return this.contact ? `&email=${encodeURIComponent(this.contact)}` : "";
  }

  async search(query: string): Promise<GeocodingResult[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    let response: Response;
    try {
      response = await fetch(
        `${this.baseUrl}/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=5&addressdetails=0${this.contactQuery()}`,
        { headers: this.headers(), cache: "no-store" },
      );
    } catch (error) {
      log.warn({ err: error }, "geocoding search unreachable");
      throw apiErrors.upstreamUnavailable("Location search is temporarily unavailable.");
    }
    if (!response.ok) {
      log.warn({ status: response.status }, "geocoding search upstream error");
      throw apiErrors.upstreamUnavailable("Location search is temporarily unavailable.");
    }
    const rows = (await response.json()) as NominatimSearchRow[];
    return rows
      .map((row) => ({
        id: String(row.place_id),
        displayName: row.display_name,
        latitude: Number(row.lat),
        longitude: Number(row.lon),
      }))
      .filter(
        (row) =>
          Number.isFinite(row.latitude) &&
          Number.isFinite(row.longitude) &&
          row.displayName.length > 0,
      );
  }

  async reverse(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    let response: Response;
    try {
      response = await fetch(
        `${this.baseUrl}/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2${this.contactQuery()}`,
        { headers: this.headers(), cache: "no-store" },
      );
    } catch (error) {
      log.warn({ err: error }, "reverse geocoding unreachable");
      throw apiErrors.upstreamUnavailable("Location lookup is temporarily unavailable.");
    }
    if (!response.ok) {
      log.warn({ status: response.status }, "reverse geocoding upstream error");
      throw apiErrors.upstreamUnavailable("Location lookup is temporarily unavailable.");
    }
    const row = (await response.json()) as NominatimReverseRow & { error?: string };
    if (!row.display_name) return null;
    return {
      id: String(row.place_id),
      displayName: row.display_name,
      latitude,
      longitude,
    };
  }
}

/* ── Provider resolution ─────────────────────────────────────────────────── */

let cached: GeocodingProvider | null = null;

export function getGeocodingProvider(): GeocodingProvider {
  if (cached) return cached;
  const { geocoding } = getServerConfig();
  cached = new NominatimProvider(geocoding.baseUrl, geocoding.userAgent, geocoding.contact);
  return cached;
}

/* ── Service surface used by controllers ─────────────────────────────────── */

export async function searchLocations(query: string): Promise<GeocodingResult[]> {
  return getGeocodingProvider().search(query);
}

export async function reverseLookup(latitude: number, longitude: number): Promise<GeocodingResult | null> {
  return getGeocodingProvider().reverse(latitude, longitude);
}
