/**
 * Geocoding abstraction — normalization and graceful provider failures.
 * Provider HTTP is mocked at the fetch boundary; no real upstream calls.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/http/errors";
import { NominatimProvider } from "@/server/services/geocoding/geocoding.service";

const provider = new NominatimProvider("https://geo.example.test", "test-suite/1.0", null);

function mockFetch(payload: unknown, init: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = init;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      status,
      json: async () => payload,
    })) as unknown as typeof fetch,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("search normalization", () => {
  it("normalizes provider rows into GeocodingResult and drops malformed rows", async () => {
    mockFetch([
      { place_id: 123, display_name: "Bamenda, North-West, Cameroon", lat: "5.9631", lon: "10.1591" },
      { place_id: 456, display_name: "Douala, Littoral, Cameroon", lat: "4.0511", lon: "9.7679" },
      { place_id: 789, display_name: "", lat: "not-a-number", lon: "9.0" },
    ]);

    const results = await provider.search("bamenda");
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      id: "123",
      displayName: "Bamenda, North-West, Cameroon",
      latitude: 5.9631,
      longitude: 10.1591,
    });
    expect(typeof results[0]!.latitude).toBe("number");
  });

  it("returns [] for trivially short queries without calling the provider", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(provider.search("a")).resolves.toEqual([]);
    await expect(provider.search("   ")).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("maps upstream non-200 responses to 502 UPSTREAM_UNAVAILABLE", async () => {
    mockFetch({}, { ok: false, status: 503 });
    const error = await provider.search("douala").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
    expect((error as ApiError).code).toBe("UPSTREAM_UNAVAILABLE");
  });

  it("maps network failures to 502 UPSTREAM_UNAVAILABLE", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("dns exploded");
    }));
    const error = await provider.search("yaounde").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("UPSTREAM_UNAVAILABLE");
  });
});

describe("reverse normalization", () => {
  it("resolves coordinates to a display name", async () => {
    mockFetch({ place_id: 77, display_name: "Mile 4, Bamenda" });
    const result = await provider.reverse(5.9631, 10.1591);
    expect(result).toEqual({
      id: "77",
      displayName: "Mile 4, Bamenda",
      latitude: 5.9631,
      longitude: 10.1591,
    });
  });

  it("returns null when nothing resolves (graceful, coordinates stay valid)", async () => {
    mockFetch({ error: "Unable to geocode" });
    await expect(provider.reverse(0, 0)).resolves.toBeNull();
  });

  it("responds to upstream failure with 502 (caller decides fallback)", async () => {
    mockFetch({}, { ok: false, status: 500 });
    const error = await provider.reverse(1, 1).catch((caught: unknown) => caught);
    expect((error as ApiError).code).toBe("UPSTREAM_UNAVAILABLE");
  });
});
