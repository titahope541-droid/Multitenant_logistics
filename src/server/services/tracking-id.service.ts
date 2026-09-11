/**
 * Tracking ID generation service — the ONLY place tracking IDs are minted.
 *
 * Format (documented in docs/package-management.md §tracking-id):
 *
 *   PKG-{TENANT3}-{YYYYMMDD}-{RANDOM6}    e.g. PKG-SWL-20260909-K7Q2X9
 *
 *   · {TENANT3}   first 3 letters of the tenant slug, uppercase — human
 *                 context without exposing internals
 *   · {YYYYMMDD}  mint date — operable lookup by era
 *   · {RANDOM6}   6 crypto-random chars from an unambiguous 31-char
 *                 alphabet (~0.9 billion combinations) — difficult to
 *                 guess/enumerate, unlike the MongoDB _id which is never
 *                 used as the customer-facing identifier
 *
 * Uniqueness is guaranteed by the unique index; generation pre-checks and
 * the package service retries on the vanishingly rare 11000 collision.
 * IDs are NEVER typed by tenant admins.
 */

import { randomInt } from "node:crypto";

const RANDOM_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L
const RANDOM_LENGTH = 6;

function randomPart(): string {
  let out = "";
  for (let i = 0; i < RANDOM_LENGTH; i += 1) {
    out += RANDOM_ALPHABET[randomInt(0, RANDOM_ALPHABET.length)];
  }
  return out;
}

function tenantPart(tenantSlug: string): string {
  const letters = tenantSlug.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return (letters.slice(0, 3) || "GEN").padEnd(3, "X");
}

function datePart(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function generateTrackingId(tenantSlug: string): string {
  return `PKG-${tenantPart(tenantSlug)}-${datePart()}-${randomPart()}`;
}
