/**
 * Shared API wire types — the typed mirror of docs/api.md §3.
 *
 * Safe to import from BOTH client and server code (pure types, no runtime
 * dependencies). The server renders these envelopes in `respond.ts`;
 * the browser unwraps them in `src/services/api-client.ts`.
 */

export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorBody {
  /** Machine-stable identifier from the error code registry. */
  code: string;
  /** Human-readable, display-safe message. */
  message: string;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorBody;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

/** Payload of GET /api/health (mirrors the server HealthReport). */
export interface ApiHealthData {
  service: string;
  version: string;
  phase: number;
  environment: string;
  checks: {
    database: { status: "up" | "down"; latencyMs: number | null };
  };
  uptimeSeconds: number;
  timestamp: string;
}
