/**
 * Geocoding controller — thin adapters; provider calls happen one level
 * down behind the abstraction. Rate limits protect the upstream provider
 * (20 requests/IP/minute per concern) in addition to the global limit.
 */

import type { NextRequest, NextResponse } from "next/server";
import { apiErrors } from "@/server/http/errors";
import { ok } from "@/server/http/respond";
import type { AuthContext } from "@/server/middleware/auth";
import { checkRateLimit, clientRateLimitKey } from "@/server/middleware/security";
import { reverseLookup, searchLocations } from "@/server/services/geocoding/geocoding.service";
import { getLogger } from "@/server/utils/logger";
import { validate } from "@/server/validators";
import {
  geocodingReverseQuerySchema,
  geocodingSearchQuerySchema,
} from "@/server/validators/geocoding.validators";

const log = getLogger("geocoding");
const GEOCODING_RATE_LIMIT = 20;
const GEOCODING_WINDOW_MS = 60_000;

function guardGeocodingRate(request: NextRequest, scope: string): void {
  const key = `geocode:${scope}:${clientRateLimitKey(request)}`;
  const outcome = checkRateLimit(key, GEOCODING_RATE_LIMIT, GEOCODING_WINDOW_MS);
  if (!outcome.allowed) {
    log.warn({ scope }, "geocoding rate limited");
    throw apiErrors.rateLimited("Too many location lookups. Please wait a moment.");
  }
}

export async function searchGeocodingController(
  request: NextRequest,
  _auth: AuthContext,
): Promise<NextResponse> {
  guardGeocodingRate(request, "search");
  const { q } = validate(
    geocodingSearchQuerySchema,
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  const results = await searchLocations(q);
  return ok({ results });
}

export async function reverseGeocodingController(
  request: NextRequest,
  _auth: AuthContext,
): Promise<NextResponse> {
  guardGeocodingRate(request, "reverse");
  const { lat, lng } = validate(
    geocodingReverseQuerySchema,
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  const result = await reverseLookup(lat, lng);
  return ok({ result });
}
