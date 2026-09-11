/**
 * Password utility — the ONLY place password hashing happens.
 *
 *   auth service → password utility → Argon2id
 *
 * Argon2id (memory-hard, side-channel resistant) is the locked choice.
 * Hash parameters are deliberately conservative defaults from argon2
 * (OWASP-recommended profile); raising them later only requires rehashing
 * on next login — hash format embeds parameters.
 *
 * NEVER log plaintext passwords or hashes anywhere downstream.
 */

import argon2 from "argon2";

/* ── Password policy (V1 — documented in docs/authentication.md §policy) ───
 * Minimum 10 characters, maximum 128, no all-whitespace values.
 * No arbitrary complexity circus: length is the control that matters.
 * ────────────────────────────────────────────────────────────────────────── */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordPolicyResult {
  valid: boolean;
  issues: string[];
}

export function checkPasswordPolicy(candidate: string): PasswordPolicyResult {
  const issues: string[] = [];
  if (candidate.length < PASSWORD_MIN_LENGTH) {
    issues.push(`must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (candidate.length > PASSWORD_MAX_LENGTH) {
    issues.push(`must be at most ${PASSWORD_MAX_LENGTH} characters`);
  }
  if (candidate.trim().length === 0) {
    issues.push("must not be blank");
  }
  return { valid: issues.length === 0, issues };
}

/* ── Hashing ─────────────────────────────────────────────────────────────── */

export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    // Malformed/corrupt stored hash — treat as non-match, never throw upward.
    return false;
  }
}

/* ── Dummy hash for timing mitigation ───────────────────────────────────────
 * When a login email does not exist, we still perform one Argon2id verify
 * against this constant so "unknown email" and "wrong password" cost the
 * same amount of server work. Verified result is discarded.
 * ─────────────────────────────────────────────────────────────────────────── */

let dummyHashPromise: Promise<string> | null = null;

export function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword("dummy-password-for-timing-mitigation");
  return dummyHashPromise;
}

/* ── Temporary passwords (tenant provisioning / admin resets, Phase 4) ─────
 * Generated server-side, shown ONCE to the Platform Admin, never stored,
 * never logged, never retrievable afterward — only the Argon2id hash
 * persists. Alphabet avoids ambiguous characters (no 0/O, 1/l/I).
 * ─────────────────────────────────────────────────────────────────────────── */

import { randomInt } from "node:crypto";

const TEMP_PASSWORD_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export function generateTemporaryPassword(): string {
  const group = (length: number): string => {
    let out = "";
    for (let i = 0; i < length; i += 1) {
      out += TEMP_PASSWORD_ALPHABET[randomInt(0, TEMP_PASSWORD_ALPHABET.length)];
    }
    return out;
  };
  // e.g. "k7m2-pq8x-h9w4" — 14 chars, satisfies the V1 policy (≥ 10)
  return `${group(4)}-${group(4)}-${group(4)}`;
}
