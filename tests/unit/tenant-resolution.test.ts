/**
 * Host parsing — the V1 subdomain model. Pure-function tests over every
 * host shape the router can see, locally and in production.
 */

import { describe, expect, it } from "vitest";
import { parseHost } from "@/server/services/tenant-resolution.service";

const DOMAIN = "yourplatform.com";

describe("parseHost", () => {
  it("maps platform roots to the platform surface", () => {
    expect(parseHost(DOMAIN, DOMAIN)).toEqual({ kind: "platform" });
    expect(parseHost(`www.${DOMAIN}`, DOMAIN)).toEqual({ kind: "platform" });
  });

  it("maps the admin subdomain to the control plane", () => {
    expect(parseHost(`admin.${DOMAIN}`, DOMAIN)).toEqual({ kind: "platform-admin" });
  });

  it("extracts single-level tenant slugs on the platform domain", () => {
    expect(parseHost(`swift.${DOMAIN}`, DOMAIN)).toEqual({ kind: "tenant-host", slug: "swift" });
    expect(parseHost(`apex-freight.${DOMAIN}:443`, DOMAIN)).toEqual({
      kind: "tenant-host",
      slug: "apex-freight",
    });
  });

  it("supports the local-development pattern {slug}.localhost", () => {
    expect(parseHost("swift.localhost", DOMAIN)).toEqual({ kind: "tenant-host", slug: "swift" });
    expect(parseHost("swift.localhost:3000", DOMAIN)).toEqual({ kind: "tenant-host", slug: "swift" });
  });

  it("treats plain localhost as the platform root", () => {
    expect(parseHost("localhost", DOMAIN)).toEqual({ kind: "platform" });
    expect(parseHost("localhost:3000", DOMAIN)).toEqual({ kind: "platform" });
    expect(parseHost("127.0.0.1", DOMAIN)).toEqual({ kind: "platform" });
    expect(parseHost("127.0.0.1:3000", DOMAIN)).toEqual({ kind: "platform" });
  });

  it("rejects anything outside the V1 subdomain model", () => {
    expect(parseHost(`deep.swift.${DOMAIN}`, DOMAIN)).toEqual({ kind: "unknown-host" }); // multi-level
    expect(parseHost("some-other-domain.com", DOMAIN)).toEqual({ kind: "unknown-host" });
  });

  it("normalizes case and tolerates empty hosts", () => {
    expect(parseHost("SWIFT.YOURPLATFORM.COM", DOMAIN)).toEqual({ kind: "tenant-host", slug: "swift" });
    expect(parseHost("", DOMAIN)).toEqual({ kind: "platform" });
    expect(parseHost(null, DOMAIN)).toEqual({ kind: "platform" });
  });

  it("serves the platform surface on configured preview host suffixes", () => {
    const suffixes = [".preview-platform.app"];
    expect(parseHost("deploy-abc123.preview-platform.app", DOMAIN, suffixes)).toEqual({ kind: "platform" });
    expect(parseHost("deploy-abc123.preview-platform.app:443", DOMAIN, suffixes)).toEqual({ kind: "platform" });
    // …and without the suffix configured, the same host is correctly unknown
    expect(parseHost("deploy-abc123.preview-platform.app", DOMAIN)).toEqual({ kind: "unknown-host" });
  });
});
