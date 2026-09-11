/**
 * Browser API client — the single place UI code performs HTTP.
 *
 * `fetch` appears here and nowhere else in browser code
 * (docs/frontend.md §4). The client speaks the standard envelopes from
 * docs/api.md §3 and converts every failure into a typed `ApiClientError`,
 * so components handle UI — not HTTP plumbing.
 */

import type { ApiEnvelope } from "@/types/api";

const DEFAULT_BASE = "/api/v1";

export class ApiClientError extends Error {
  /** Machine-stable code from the API error registry (or client-side code). */
  readonly code: string;
  /** HTTP status, or null when the request never reached the server. */
  readonly status: number | null;

  constructor(message: string, code = "UNKNOWN", status: number | null = null) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

function resolveBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_BASE;
}

/**
 * Paths starting with "/api" are used verbatim (infrastructure endpoints
 * like /api/health live outside the versioned base); everything else is
 * prefixed with the /api/v1 base.
 */
function buildUrl(path: string): string {
  return path.startsWith("/api") ? path : `${resolveBaseUrl()}${path}`;
}

async function request<TData>(path: string, init?: RequestInit): Promise<TData> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      cache: "no-store",
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiClientError("Network request failed.", "NETWORK_ERROR", null);
  }

  let envelope: ApiEnvelope<TData>;
  try {
    envelope = (await response.json()) as ApiEnvelope<TData>;
  } catch {
    throw new ApiClientError(
      `Unexpected non-JSON response (HTTP ${response.status}).`,
      "BAD_RESPONSE",
      response.status,
    );
  }

  if (!envelope.success) {
    throw new ApiClientError(envelope.error.message, envelope.error.code, response.status);
  }
  return envelope.data;
}

export const apiClient = {
  get: <TData>(path: string): Promise<TData> => request<TData>(path, { method: "GET" }),
  post: <TData>(path: string, body: unknown): Promise<TData> =>
    request<TData>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  patch: <TData>(path: string, body: unknown): Promise<TData> =>
    request<TData>(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
};
