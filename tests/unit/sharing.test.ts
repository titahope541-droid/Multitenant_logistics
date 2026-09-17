/**
 * Sharing helpers — tracking URL construction across environments and
 * the WhatsApp share URL contract. Pure-function tests, no I/O.
 */

import { describe, expect, it } from "vitest";
import { buildTrackingUrl, buildWhatsAppShareUrl } from "@/lib/tracking-link";

const PARTS = { slug: "swift", trackingId: "PKG-SWI-20260909-K7Q2X9" };

describe("buildTrackingUrl", () => {
  it("builds production tenant URLs on the platform domain", () => {
    expect(
      buildTrackingUrl(PARTS, { platformDomain: "nttrack.com", isLocal: false }),
    ).toBe("https://swift.nttrack.com/track?trackingId=PKG-SWI-20260909-K7Q2X9");
  });

  it("builds local development URLs on {slug}.localhost with port", () => {
    expect(buildTrackingUrl(PARTS, { isLocal: true, localPort: 3100 })).toBe(
      "http://swift.localhost:3100/track?trackingId=PKG-SWI-20260909-K7Q2X9",
    );
    expect(buildTrackingUrl(PARTS, { isLocal: true })).toBe(
      "http://swift.localhost:3000/track?trackingId=PKG-SWI-20260909-K7Q2X9",
    );
  });

  it("URL-encodes the tracking ID and never carries tenantId or internals", () => {
    const url = buildTrackingUrl(
      { slug: "apex", trackingId: "PKG-ODD ID/+2026" },
      { platformDomain: "nttrack.com", isLocal: false },
    );
    expect(url).toContain("trackingId=PKG-ODD%20ID%2F%2B2026");
    expect(url).not.toContain("tenantId=");
    expect(url).not.toContain("/api/");
    expect(url).not.toContain("ObjectId");
  });

  it("respects a real production domain", () => {
    expect(
      buildTrackingUrl(
        { slug: "apex-freight", trackingId: "PKG-APE-20260909-XXXXXX" },
        { platformDomain: "meridianlogistics.com", isLocal: false },
      ),
    ).toBe("https://apex-freight.meridianlogistics.com/track?trackingId=PKG-APE-20260909-XXXXXX");
  });
});

describe("buildWhatsAppShareUrl", () => {
  it("builds a wa.me URL with the encoded professional message", () => {
    const trackingUrl = "https://swift.nttrack.com/track?trackingId=PKG-SWI-20260909-K7Q2X9";
    const shareUrl = buildWhatsAppShareUrl({
      companyName: "Swift Logistics",
      trackingId: "PKG-SWI-20260909-K7Q2X9",
      trackingUrl,
    });

    expect(shareUrl.startsWith("https://wa.me/?text=")).toBe(true);
    const message = decodeURIComponent(shareUrl.split("text=")[1]!);
    expect(message).toContain("Swift Logistics");
    expect(message).toContain("PKG-SWI-20260909-K7Q2X9");
    expect(message).toContain(trackingUrl);
    expect(message).toContain("track your package");
  });

  it("encodes special characters correctly (company names, &, ampersands, URLs)", () => {
    const shareUrl = buildWhatsAppShareUrl({
      companyName: "R&D Express & Co.",
      trackingId: "PKG-RND-1-AAAAAA",
      trackingUrl: "https://rnd.nttrack.com/track?trackingId=PKG-RND-1-AAAAAA",
    });
    // raw ampersand must never break the query string
    expect(shareUrl.split("text=")).toHaveLength(2);
    const message = decodeURIComponent(shareUrl);
    expect(message).toContain("R&D Express & Co.");
  });

  it("contains only public-safe content (no contacts/internals possible)", () => {
    const shareUrl = buildWhatsAppShareUrl({
      companyName: "Swift Logistics",
      trackingId: "PKG-SWI-20260909-K7Q2X9",
      trackingUrl: "https://swift.nttrack.com/track?trackingId=PKG-SWI-20260909-K7Q2X9",
    });
    const message = decodeURIComponent(shareUrl);
    expect(message).not.toContain("tenantId");
    expect(message).not.toContain("password");
    expect(message).not.toContain("@"); // no emails in the message shape
  });
});
