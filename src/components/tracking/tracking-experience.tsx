"use client";

/**
 * Customer tracking — enter an ID, see the shipment.
 *
 * REST provides the initial snapshot (the database is the truth), then
 * Socket.IO pushes status/location changes into the same view. Designed
 * for a first-time visitor on a phone: one input, one button, then a
 * clear answer.
 */

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Copy, MapPin, PackageSearch, Search } from "lucide-react";
import { TrackingMap } from "@/components/maps/tracking-map";
import { TrackingTimeline } from "@/components/tracking/tracking-timeline";
import {
  useTrackingRealtime,
  type RealtimeStatus,
} from "@/components/tracking/use-tracking-realtime";
import { TRACKING_ID_PARAM_PATTERN } from "@/lib/validation-patterns";
import { useCopyToClipboard } from "@/lib/use-copy";
import { ApiClientError, apiClient } from "@/services/api-client";
import { PACKAGE_STATUS_META, type PublicTrackingResult } from "@/types/domain";
import { cn } from "@/lib/utils";

type ErrorKind = "empty" | "invalid" | "not-found" | "unavailable" | "server";

const ERROR_COPY: Record<ErrorKind, string> = {
  empty: "Please enter a tracking ID.",
  invalid: "That tracking ID doesn't look right — please check it and try again.",
  "not-found": "Package not found. Please check your tracking ID and try again.",
  unavailable: "Tracking is temporarily unavailable. Please check back later.",
  server: "Something went wrong on our side. Please try again in a moment.",
};

function mapError(error: unknown): ErrorKind {
  if (error instanceof ApiClientError) {
    if (error.code === "PACKAGE_NOT_FOUND") return "not-found";
    if (error.code === "VALIDATION_ERROR") return "invalid";
    if (error.code === "TENANT_SUSPENDED" || error.code === "TENANT_ARCHIVED") return "unavailable";
  }
  return "server";
}

function fetchTracking(trackingId: string): Promise<PublicTrackingResult> {
  return apiClient.get<PublicTrackingResult>(`/public/track/${encodeURIComponent(trackingId)}`);
}

function ConnectionChip({ status }: { status: RealtimeStatus }) {
  if (status === "idle") return null;
  const copy: Record<Exclude<RealtimeStatus, "idle">, { label: string; className: string }> = {
    connecting: { label: "Connecting…", className: "text-amber-700 bg-amber-50" },
    live: { label: "Live updates on", className: "text-emerald-700 bg-emerald-50" },
    reconnecting: { label: "Reconnecting…", className: "text-amber-700 bg-amber-50" },
  };
  const chip = copy[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium",
        chip.className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full bg-current", status !== "live" && "animate-pulse")}
        aria-hidden="true"
      />
      {chip.label}
    </span>
  );
}

export function TrackingExperience({ initialTrackingId = "" }: { initialTrackingId?: string }) {
  const [input, setInput] = useState(initialTrackingId);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PublicTrackingResult | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const linkCopy = useCopyToClipboard();

  const resync = useCallback(async (trackingId: string) => {
    try {
      setResult(await fetchTracking(trackingId));
    } catch {
      /* keep the last known state; the chip communicates the connection */
    }
  }, []);

  /* Deep link: /track?trackingId=… loads exactly like a manual search. */
  useEffect(() => {
    if (!initialTrackingId || !TRACKING_ID_PARAM_PATTERN.test(initialTrackingId)) return;
    let cancelled = false;
    setBusy(true);
    fetchTracking(initialTrackingId)
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setErrorKind(null);
        }
      })
      .catch((cause) => {
        if (!cancelled) setErrorKind(mapError(cause));
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialTrackingId]);

  const realtimeStatus = useTrackingRealtime(
    result?.trackingId ?? null,
    useCallback((apply: (current: PublicTrackingResult) => PublicTrackingResult) => {
      setResult((current) => (current ? apply(current) : current));
      setUpdatedAt(new Date());
    }, []),
    resync,
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const id = input.trim();
    if (!id) {
      setErrorKind("empty");
      return;
    }
    if (!TRACKING_ID_PARAM_PATTERN.test(id)) {
      setErrorKind("invalid");
      setResult(null);
      return;
    }
    setBusy(true);
    setErrorKind(null);
    try {
      setResult(await fetchTracking(id));
    } catch (cause) {
      setResult(null);
      setErrorKind(mapError(cause));
    } finally {
      setBusy(false);
    }
  }

  const statusMeta = result ? PACKAGE_STATUS_META[result.status] : null;

  return (
    <div>
      {/* Search */}
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:p-5"
      >
        <label htmlFor="tracking-id" className="mb-2 block text-[13px] font-medium text-neutral-700">
          Tracking ID
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              id="tracking-id"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="e.g. PKG-SWI-20260909-K7Q2X9"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-black/12 bg-white py-3.5 pr-4 pl-10 font-mono text-[14px] text-neutral-900 outline-none transition-colors placeholder:font-sans placeholder:text-neutral-400 focus:border-[color:var(--brand)]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "var(--brand)" }}
          >
            <PackageSearch className="h-4 w-4" aria-hidden="true" />
            {busy ? "Tracking…" : "Track package"}
          </button>
        </div>
        <p className="mt-2.5 text-[12.5px] text-neutral-500">
          No account needed — your tracking ID came from the company that shipped your package.
        </p>
      </form>

      {errorKind ? (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-[13.5px] leading-6 text-red-700"
        >
          {ERROR_COPY[errorKind]}
        </p>
      ) : null}

      {/* Result */}
      {result && statusMeta ? (
        <div className="mt-6 space-y-5" aria-live="polite">
          {/* Summary */}
          <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
            <div
              className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-5 py-4 sm:px-6"
              style={{ backgroundColor: "var(--brand-soft)" }}
            >
              <div>
                <p className="font-mono text-[12.5px] tracking-tight text-neutral-500">
                  {result.trackingId}
                </p>
                <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.01em] text-neutral-900">
                  {result.packageName}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold ring-1 ring-black/5"
                  style={{ color: "var(--brand)" }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                  {statusMeta.label}
                  <span className="font-normal text-neutral-400">step {statusMeta.step} of 5</span>
                </span>
                <button
                  type="button"
                  onClick={() => void linkCopy.copy(window.location.href)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-600 ring-1 ring-black/5 transition-colors hover:text-neutral-900"
                >
                  {linkCopy.state === "copied" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {linkCopy.state === "copied" ? "Link copied" : "Share"}
                </button>
              </div>
            </div>

            <dl className="grid gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-3 sm:px-6">
              <div>
                <dt className="text-[12px] text-neutral-500">From / to</dt>
                <dd className="mt-1 text-[14px] font-medium text-neutral-900">
                  {result.senderName} → {result.receiverName}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-neutral-500">Estimated delivery</dt>
                <dd className="mt-1 text-[14px] font-medium text-neutral-900">
                  {result.estimatedDelivery
                    ? new Date(result.estimatedDelivery).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })
                    : "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-neutral-500">Last updated</dt>
                <dd className="mt-1 text-[14px] font-medium text-neutral-900">
                  {new Date(result.lastUpdated).toLocaleString()}
                </dd>
              </div>
            </dl>
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* Timeline */}
            <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-5 text-[15px] font-semibold text-neutral-900">Status timeline</h3>
              <TrackingTimeline result={result} />
            </section>

            {/* Location */}
            <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
                <h3 className="text-[15px] font-semibold text-neutral-900">Current location</h3>
                <ConnectionChip status={realtimeStatus} />
              </div>
              <TrackingMap location={result.currentLocation} />
              {result.currentLocation ? (
                <dl className="grid gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-2 sm:px-6">
                  <div className="sm:col-span-2">
                    <dt className="text-[12px] text-neutral-500">Location</dt>
                    <dd className="mt-1 flex items-center gap-2 text-[14px] font-medium text-neutral-900">
                      <MapPin className="h-4 w-4" style={{ color: "var(--brand)" }} aria-hidden="true" />
                      {result.currentLocation.locationName ?? "Coordinates only"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-neutral-500">Coordinates</dt>
                    <dd className="mt-1 font-mono text-[13px] text-neutral-700">
                      {result.currentLocation.latitude.toFixed(4)},{" "}
                      {result.currentLocation.longitude.toFixed(4)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-neutral-500">Updated</dt>
                    <dd className="mt-1 text-[13px] text-neutral-700">
                      {new Date(result.currentLocation.updatedAt).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="px-5 py-4 text-[13.5px] text-neutral-500 sm:px-6">
                  No location recorded for this package yet.
                </p>
              )}
              {updatedAt ? (
                <p className="border-t border-black/10 px-5 py-3 text-[12px] text-neutral-500 sm:px-6">
                  Updated {updatedAt.toLocaleTimeString()} — this page refreshes itself.
                </p>
              ) : null}
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
