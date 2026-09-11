/**
 * Security middleware units — sliding-window rate limiter and the Origin
 * allow-list. Deterministic, time-window small enough to expire mid-test.
 */

import { describe, expect, it } from "vitest";
import { checkRateLimit, isOriginAllowed } from "@/server/middleware/security";

describe("checkRateLimit (sliding window)", () => {
  it("allows up to the limit then denies until the window rolls", () => {
    const key = `unit:${Math.random()}`;
    for (let i = 0; i < 5; i += 1) {
      expect(checkRateLimit(key, 5, 200).allowed).toBe(true);
    }
    const denied = checkRateLimit(key, 5, 200);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSeconds).toBeGreaterThanOrEqual(0);
  });

  it("tracks keys independently (one client can't exhaust another)", () => {
    const base = `unit:${Math.random()}`;
    for (let i = 0; i < 2; i += 1) expect(checkRateLimit(`${base}:a`, 2, 10_000).allowed).toBe(true);
    expect(checkRateLimit(`${base}:a`, 2, 10_000).allowed).toBe(false);
    expect(checkRateLimit(`${base}:b`, 2, 10_000).allowed).toBe(true);
  });

  it("re-opens after the window expires", async () => {
    const key = `unit:${Math.random()}`;
    expect(checkRateLimit(key, 1, 30).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 30).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 45));
    expect(checkRateLimit(key, 1, 30).allowed).toBe(true);
  });
});

describe("isOriginAllowed (developer/lab domain: yourplatform.com)", () => {
  it("accepts platform domain, subdomains, and localhost in non-production", () => {
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN = "yourplatform.com";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(isOriginAllowed("https://yourplatform.com")).toBe(true);
    expect(isOriginAllowed("https://swift.yourplatform.com")).toBe(true);
    expect(isOriginAllowed("https://admin.yourplatform.com")).toBe(true);
    expect(isOriginAllowed("http://localhost:3000")).toBe(true);
  });

  it("rejects foreign origins and malformed values", () => {
    expect(isOriginAllowed("https://evil.example.com")).toBe(false);
    expect(isOriginAllowed("https://yourplatform.com.evil.io")).toBe(false);
    expect(isOriginAllowed("javascript:alert(1)")).toBe(false);
    expect(isOriginAllowed("")).toBe(false);
  });
});
