/**
 * JSON body reading with a safe failure mode.
 *
 * `request.json()` throws a raw SyntaxError on malformed bodies or wrong
 * content types — which would surface as a misleading 500. This helper
 * converts both cases into a clean 400 VALIDATION_ERROR envelope.
 */

import type { NextRequest } from "next/server";
import { apiErrors } from "@/server/http/errors";

export async function readJsonBody(request: NextRequest): Promise<unknown> {
  const contentType = request.headers.get("content-type");
  if (!contentType || !contentType.toLowerCase().includes("application/json")) {
    throw apiErrors.validation("Expected a JSON request body (Content-Type: application/json).");
  }
  try {
    return await request.json();
  } catch {
    throw apiErrors.validation("Request body is not valid JSON.");
  }
}
