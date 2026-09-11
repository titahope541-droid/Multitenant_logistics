/**
 * Health service (browser side) — one typed function per capability.
 * Pattern reference for all future service modules (docs/frontend.md §4).
 */

import { apiClient } from "@/services/api-client";
import type { ApiHealthData } from "@/types/api";

export function fetchApiHealth(): Promise<ApiHealthData> {
  return apiClient.get<ApiHealthData>("/api/health");
}
