/**
 * Response envelope builders.
 *
 * The only way handlers build JSON responses, so the wire format from
 * docs/api.md §3 stays uniform:
 *
 *   success → { success: true, message?, data }
 *   failure → { success: false, error: { code, message } }
 */

import { NextResponse } from "next/server";
import type { ApiFailure, ApiSuccess } from "@/types/api";
import type { ApiError } from "@/server/http/errors";

interface OkOptions {
  message?: string;
  status?: number;
  /** Extra response headers (e.g. cache control). */
  headers?: Record<string, string>;
}

export function ok<T>(data: T, options: OkOptions = {}): NextResponse<ApiSuccess<T>> {
  const { message, status = 200, headers } = options;
  const body: ApiSuccess<T> = message
    ? { success: true, message, data }
    : { success: true, data };
  return NextResponse.json(body, { status, headers });
}

export function fail(error: ApiError): NextResponse<ApiFailure> {
  const body: ApiFailure = {
    success: false,
    error: { code: error.code, message: error.message },
  };
  return NextResponse.json(body, { status: error.status });
}
