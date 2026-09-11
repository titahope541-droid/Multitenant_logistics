/**
 * Geocoding service (browser side) — typed calls to the backend-mediated
 * search/reverse endpoints. Provider details never reach the browser.
 */

import { apiClient } from "@/services/api-client";

export interface GeocodingResultDto {
  id: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

export function searchLocations(query: string): Promise<{ results: GeocodingResultDto[] }> {
  return apiClient.get<{ results: GeocodingResultDto[] }>(
    `/admin/geocoding/search?q=${encodeURIComponent(query)}`,
  );
}

export function reverseLookup(
  latitude: number,
  longitude: number,
): Promise<{ result: GeocodingResultDto | null }> {
  return apiClient.get<{ result: GeocodingResultDto | null }>(
    `/admin/geocoding/reverse?lat=${latitude}&lng=${longitude}`,
  );
}
