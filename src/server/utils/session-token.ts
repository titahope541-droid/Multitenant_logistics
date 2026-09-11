/**
 * Session token utility.
 *
 * Sessions are OPAQUE BEARER TOKENS, not JWTs:
 *   · the cookie carries a random 256-bit token (base64url)
 *   · MongoDB stores only the SHA-256 hash of that token
 *
 * Why hash at rest: a read-only leak of the sessions collection yields no
 * usable session tokens — the same reason passwords are hashed. The raw
 * token exists only in the cookie and is never logged.
 */

import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE_NAME = "meridian_session";

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
