/**
 * Auth service (browser side) — typed functions over the auth API.
 * Phase 3 verification page consumes these; later dashboards will too.
 *
 * Cookies travel automatically (same-origin); the browser never reads the
 * HTTP-only session cookie — it only sees the safe user payload.
 */

import { apiClient } from "@/services/api-client";
import type { SafeUser } from "@/types/domain";

export interface AuthPayload {
  user: SafeUser;
}

export function login(input: { email: string; password: string }): Promise<AuthPayload> {
  return apiClient.post<AuthPayload>("/auth/login", input);
}

export function logout(): Promise<Record<string, never>> {
  return apiClient.post<Record<string, never>>("/auth/logout", {});
}

export function fetchCurrentUser(): Promise<AuthPayload> {
  return apiClient.get<AuthPayload>("/auth/me");
}

export function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<Record<string, never>> {
  return apiClient.post<Record<string, never>>("/auth/change-password", input);
}
