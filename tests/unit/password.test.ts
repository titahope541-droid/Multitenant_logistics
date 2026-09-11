/**
 * Password policy + hashing behavior. These are security properties, not
 * 200-checks: wrong passwords MUST fail, malformed hashes MUST fail closed,
 * identical passwords MUST produce different hashes (random salt).
 */

import { describe, expect, it } from "vitest";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  checkPasswordPolicy,
  getDummyHash,
  hashPassword,
  verifyPassword,
} from "@/server/utils/password";

describe("password policy", () => {
  it("rejects empty and blank passwords", () => {
    expect(checkPasswordPolicy("").valid).toBe(false);
    expect(checkPasswordPolicy("          ").valid).toBe(false);
  });

  it("rejects passwords shorter than the minimum", () => {
    const result = checkPasswordPolicy("a".repeat(PASSWORD_MIN_LENGTH - 1));
    expect(result.valid).toBe(false);
    expect(result.issues.join()).toContain("at least");
  });

  it("rejects passwords longer than the maximum", () => {
    expect(checkPasswordPolicy("a".repeat(PASSWORD_MAX_LENGTH + 1)).valid).toBe(false);
  });

  it("accepts plain long passwords (no complexity circus)", () => {
    expect(checkPasswordPolicy("correct horse battery staple").valid).toBe(true);
  });
});

describe("argon2id hashing", () => {
  it("produces argon2id hashes that verify", async () => {
    const hash = await hashPassword("my-secret-password");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    await expect(verifyPassword(hash, "my-secret-password")).resolves.toBe(true);
  });

  it("fails for a wrong password", async () => {
    const hash = await hashPassword("right-password");
    await expect(verifyPassword(hash, "wrong-password")).resolves.toBe(false);
  });

  it("uses a random salt (same input → different hashes)", async () => {
    const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")]);
    expect(a).not.toBe(b);
  });

  it("fails closed on a malformed stored hash", async () => {
    await expect(verifyPassword("not-a-real-hash", "anything")).resolves.toBe(false);
  });

  it("dummy hash verifies its sentinel (used for timing parity)", async () => {
    const dummy = await getDummyHash();
    expect(dummy.startsWith("$argon2id$")).toBe(true);
    await expect(verifyPassword(dummy, "dummy-password-for-timing-mitigation")).resolves.toBe(true);
  });
});
