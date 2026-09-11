"use client";

/**
 * Tracking experience — the customer-facing island on a tenant's /track.
 * Form → REST snapshot → allowlisted result. Realtime Socket.IO updates
 * attach at the REALTIME boundary (Phase 7) — no fake polling, no fake map.
 */

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, CloudOff, Copy, Loader2, PackageSearch, Radio } from "lucide-react";
import { ApiClientError, apiClient } from "@/services/api-client";
import { TrackingMap } from "@/components/maps/tracking-map";
import { TrackingTimeline } from "@/components/tracking/tracking-timeline";
import { useTrackingRealtime, type RealtimeStatus } from "@/components/tracking/use-tracking-realtime";
import { PACKAGE_STATUS_META, type PublicTrackingResult } from "@/types/domain";
import { TRACKING_ID_PARAM_PATTERN } from "@/lib/validation-patterns";
import { useCopyToClipboard } from "@/lib/use-copy";

function ConnectionChip({ status }: { status: RealtimeStatus }) {
  if (status === "idle") return null;
  const meta: Record<Exclude<RealtimeStatus, "idle">, { label: string; className: string }> = {
    connecting: { label: "Connecting…", className: "text-amber-600 border-amber-600/40" },
    live: { label: "Live updates connected", className: "text-emerald-700 border-emerald-700/40" },
    reconnecting: { label: "Reconnecting…", className: "text-amber-600 border-amber-600/40" },
  };
  const chip = meta[status];
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[9.5px] tracking-[0.12em] uppercase ${chip.className}`}>
      <span className={`h-1 w-1 rounded-full bg-current ${status === "live" ? "" : "animate-pulse"}`} />
      {chip.label}
    </span>
  );
}

type ErrorKind = "empty" | "invalid" | "not-found" | "unavailable" | "server";

const ERROR_COPY: Record<ErrorKind, string> = {
  empty: "Please enter a tracking ID.",
  invalid: "That tracking ID format doesn't look right — check it and try again.",
  "not-found": "Package not found. Please check your tracking ID and try again.",
  unavailable: "This tracking service is temporarily unavailable. Please check back later.",
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

async function fetchTracking(trackingId: string): Promise<PublicTrackingResult> {
  return apiClient.get<PublicTrackingResult>(`/public/track/${encodeURIComponent(trackingId)}`);
}

export function TrackingExperience({ initialTrackingId = "" }: { initialTrackingId?: string }) {
  const [input, setInput] = useState(initialTrackingId);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PublicTrackingResult | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [justUpdatedAt, setJustUpdatedAt] = useState<Date | null>(null);
  const linkCopy = useCopyToClipboard();

  const resync = useCallback(async (trackingId: string) => {
    try {
      setResult(await fetchTracking(trackingId));
    } catch {
      /* keep last-known state; the reconnect chip tells the story */
    }
  }, []);

  // ?trackingId=… deep link: validate, then load it exactly like a manual
  // submission. The query string never enters markup or queries directly.
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
      .catch(() => {
        if (!cancelled) setErrorKind("not-found");
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
    useCallback(
      (apply: (current: PublicTrackingResult) => PublicTrackingResult) => {
        setResult((current) => (current ? apply(current) : current));
        setJustUpdatedAt(new Date());
      },
      [],
    ),
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
    } catch (error) {
      setResult(null);
      setErrorKind(mapError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* form */}
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="tracking-id" className="sr-only">
          Tracking ID
        </label>
        <input
          id="tracking-id"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Enter your tracking ID, e.g. PKG-XXX-20260909-ABC123"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 border border-black/15 bg-white px-4 py-3.5 font-mono text-[14px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-(--brand)"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-[13px] font-semibold tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: "var(--brand)" }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageSearch className="h-4 w-4" />}
          {busy ? "Tracking…" : "Track Package"}
        </button>
      </form>
      <p className="mt-3 text-[12.5px] leading-5 text-neutral-500">
        No account needed. Your tracking ID came from the company that sent
        your package.
      </p>

      {/* errors */}
      {errorKind ? (
        <p
          role="alert"
          className="mt-6 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-[13.5px] leading-6 text-red-700"
        >
          {ERROR_COPY[errorKind]}
        </p>
      ) : null}

      {/* result */}
      {result ? (
        <div className="mt-8 space-y-6" aria-live="polite">
          {/* summary */}
          <section className="border border-black/10 bg-white p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] tracking-[0.15em] text-neutral-400">
                  {result.trackingId}
                </p>
                <h2 className="mt-1.5 text-xl font-bold tracking-tight text-neutral-900">
                  {result.packageName}
                </h2>
                <p className="mt-1 text-[13px] text-neutral-500">
                  {result.senderName} → {result.receiverName}
                </p>
              </div>
              <span
                className="inline-flex items-center gap-2 border px-3 py-1.5 text-[11px] font-semibold tracking-[0.1em]"
                style={{
                  color: result.status === "DELIVERED" ? "#047857" : "var(--brand)",
                  borderColor: "currentColor",
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {PACKAGE_STATUS_META[result.status].label.toUpperCase()}
                <span className="text-neutral-400">step {PACKAGE_STATUS_META[result.status].step}/5</span>
              </span>
            </div>
            <dl className="mt-5 grid gap-x-8 gap-y-2 border-t border-black/10 pt-4 font-mono text-[12px] sm:grid-cols-2">
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-400">Estimated delivery</dt>
                <dd className="text-neutral-900">
                  {result.estimatedDelivery
                    ? new Date(result.estimatedDelivery).toLocaleDateString(undefined, { dateStyle: "medium" })
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-400">Last updated</dt>
                <dd className="text-neutral-900">{new Date(result.lastUpdated).toLocaleString()}</dd>
              </div>
            </dl>
          </section>

          {/* timeline */}
          <section className="border border-black/10 bg-white p-6 sm:p-7">
            <h3 className="text-[11px] font-semibold tracking-[0.25em] text-neutral-500 uppercase">
              Status timeline
            </h3>
            <TrackingTimeline result={result} />
          </section>

          {/* current location + integration boundaries */}
          <section className="border border-black/10 bg-white p-6 sm:p-7">
            <h3 className="text-[11px] font-semibold tracking-[0.25em] text-neutral-500 uppercase">
              Current location
            </h3>
            {result.currentLocation ? (
              <div className="mt-4">
                <TrackingMap location={result.currentLocation} />
                <dl className="mt-4 grid gap-x-8 gap-y-2 font-mono text-[12px] sm:grid-cols-3">
                  <div>
                    <dt className="text-neutral-400">Location</dt>
                    <dd className="mt-1 text-neutral-900">{result.currentLocation.locationName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-400">Coordinates</dt>
                    <dd className="mt-1 text-neutral-900">
                      {result.currentLocation.latitude.toFixed(4)}, {result.currentLocation.longitude.toFixed(4)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-400">Updated</dt>
                    <dd className="mt-1 text-neutral-900">{new Date(result.currentLocation.updatedAt).toLocaleString()}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="mt-4 text-[13.5px] text-neutral-500">
                No location recorded for this package yet.
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
              <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.08em] text-neutral-400">
                <Radio className="h-3.5 w-3.5" />
                Snapshot from the database + live updates afterward
              </p>
              <span className="flex items-center gap-3">
                {justUpdatedAt ? (
                  <span className="font-mono text-[9.5px] tracking-[0.1em] text-neutral-400 uppercase" aria-live="polite">
                    Updated {justUpdatedAt.toLocaleTimeString()}
                  </span>
                ) : null}
                <ConnectionChip status={realtimeStatus} />
              </span>
            </div>
          </section>
        </div>
      ) : null}

      {errorKind === "unavailable" ? (
        <div className="mt-10 text-center text-neutral-500">
          <CloudOff className="mx-auto h-8 w-8" strokeWidth={1.25} />
        </div>
      ) : null}
    </div>
  );
}
