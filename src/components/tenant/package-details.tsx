"use client";

/**
 * Package details — /dashboard/packages/:id. Full admin projection:
 * parties, specs, payment metadata, delivery, current location, both
 * histories, and the operational forms (status, location, archive/restore).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Loader2 } from "lucide-react";
import { ApiClientError } from "@/services/api-client";
import * as packagesService from "@/services/packages";
import { ShareActions } from "@/components/shared/share-actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { LocationPicker } from "@/components/maps/location-picker";
import { StatusBadge } from "@/components/tenant/status-badge";
import { PACKAGE_STATUSES, PACKAGE_STATUS_META, type PackageStatus } from "@/types/domain";
import type { AdminPackageDetails } from "@/types/package";

const panelClass = "border border-line bg-panel p-5 sm:p-6";
const panelTitleClass = "mb-4 font-mono text-[10px] tracking-[0.25em] text-signal uppercase";
const inputClass =
  "w-full border border-line bg-ink px-3.5 py-2.5 text-sm text-paper outline-none transition-colors placeholder:text-dim/60 focus:border-signal";
const labelClass = "mb-1.5 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase";

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-dim">{label}</dt>
      <dd className="text-paper">{value}</dd>
    </>
  );
}

export function PackageDetails({
  packageId,
  companyName,
  slug,
}: {
  packageId: string;
  companyName: string;
  slug: string;
}) {
  const [details, setDetails] = useState<AdminPackageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [newStatus, setNewStatus] = useState<PackageStatus | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"status" | "location" | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDetails(await packagesService.getPackageDetails(packageId));
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(kind: "status" | "location", action: () => Promise<AdminPackageDetails>, okMessage: string) {
    setBusy(kind);
    setFlash(null);
    setError(null);
    try {
      setDetails(await action());
      setFlash(okMessage);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Unexpected error.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading package
      </div>
    );
  }
  if (!details) {
    return (
      <p role="alert" className="border-l-2 border-crimson px-3 py-2 font-mono text-[11px] text-crimson">
        {error ?? "Package could not be loaded."}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/packages" className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-dim uppercase transition-colors hover:text-paper">
        <ArrowLeft className="h-3 w-3" /> All packages
      </Link>

      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-5 border border-line bg-panel p-5 sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-xl font-semibold tracking-[0.06em] text-signal sm:text-2xl">
              {details.trackingId}
            </h1>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(details.trackingId);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex items-center gap-1.5 border border-line px-2 py-1 font-mono text-[9px] tracking-[0.15em] text-fog uppercase transition-colors hover:border-paper/40 hover:text-paper"
            >
              {copied ? <Check className="h-3 w-3 text-mint" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-sm text-fog">{details.packageName}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={details.status} withStep />
            {details.archived ? (
              <span className="border border-amber/50 px-2 py-0.5 font-mono text-[9.5px] tracking-[0.15em] text-amber">ARCHIVED</span>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          {details.archived ? (
            <ConfirmButton confirmLabel="Confirm restore" onConfirm={async () => { setDetails(await packagesService.restorePackage(details.id)); }}>
              Restore package
            </ConfirmButton>
          ) : (
            <ConfirmButton confirmLabel="Confirm archive" tone="danger" onConfirm={async () => { setDetails(await packagesService.archivePackage(details.id)); }}>
              Archive package
            </ConfirmButton>
          )}
        </div>
      </div>

      {flash ? <p role="status" className="border-l-2 border-mint px-3 py-2 font-mono text-[11px] text-mint">{flash}</p> : null}
      {error ? <p role="alert" className="border-l-2 border-crimson px-3 py-2 font-mono text-[11px] text-crimson">{error}</p> : null}

      {/* customer sharing */}
      <section className={panelClass}>
        <p className={panelTitleClass}>Customer tracking</p>
        <p className="mb-4 font-mono text-[10.5px] leading-4 text-dim">
          Your customer tracks this package live with the ID below — share
          it however suits you. Only the company name, tracking ID, and the
          public tracking link are ever included.
        </p>
        <p className="mb-3 font-mono text-[12px] text-fog">
          Tracking ID: <span className="text-signal">{details.trackingId}</span>
        </p>
        <ShareActions
          trackingId={details.trackingId}
          companyName={companyName}
          slug={slug}
          layout="card"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* operations */}
        <div className="space-y-6">
          <section className={panelClass}>
            <p className={panelTitleClass}>Update status</p>
            {details.archived ? (
              <p className="font-mono text-[10.5px] leading-4 text-dim">Archived package — restore it to change status.</p>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!newStatus) return;
                  void run("status", () =>
                    packagesService.changePackageStatus(details.id, {
                      status: newStatus,
                      ...(note.trim() ? { note: note.trim() } : {}),
                    }), `Status updated — event recorded (${PACKAGE_STATUS_META[newStatus].label}).`);
                  setNewStatus("");
                  setNote("");
                }}
                className="space-y-3"
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as PackageStatus)} required aria-label="New status" className={inputClass}>
                    <option value="" disabled>
                      Choose among the five statuses…
                    </option>
                    {PACKAGE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {PACKAGE_STATUS_META[status].label} (step {PACKAGE_STATUS_META[status].step})
                      </option>
                    ))}
                  </select>
                  <button type="submit" disabled={busy !== null || !newStatus} className="inline-flex items-center justify-center gap-2 border border-paper/25 bg-paper px-4 py-2.5 font-mono text-[10px] font-medium tracking-[0.18em] text-ink uppercase transition-colors hover:border-signal hover:bg-signal disabled:opacity-50">
                    {busy === "status" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Apply
                  </button>
                </div>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note, e.g. left Lagos facility" className={inputClass} />
                <p className="font-mono text-[9.5px] leading-4 text-dim">
                  Admin overrides are legitimate — every change is appended to history; In&nbsp;Transit may repeat after a facility arrival.
                </p>
              </form>
            )}
          </section>

          <section className={panelClass}>
            <p className={panelTitleClass}>Update location</p>
            {details.archived ? (
              <p className="font-mono text-[10.5px] leading-4 text-dim">Archived package — restore it to update location.</p>
            ) : (
              <LocationPicker
                initial={details.currentLocation}
                busy={busy !== null}
                onConfirm={async (input) => {
                  await run("location", () =>
                    packagesService.updatePackageLocation(details.id, input),
                    "Location updated — history appended and live customers notified.");
                }}
              />
            )}
          </section>

          <section className={panelClass}>
            <p className={panelTitleClass}>Location history ({details.locationHistory.length})</p>
            {details.locationHistory.length === 0 ? (
              <p className="font-mono text-[10.5px] text-dim">No location records yet.</p>
            ) : (
              <ul className="space-y-2 font-mono text-[11px]">
                {details.locationHistory.map((row, index) => (
                  <li key={`${row.recordedAt}-${index}`} className="flex flex-wrap items-baseline gap-x-3 border-b border-line pb-2 last:border-b-0">
                    <span className="text-paper">{row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}</span>
                    <span className="text-fog">{row.locationName ?? ""}</span>
                    <span className="ml-auto text-dim">{new Date(row.recordedAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* facts + status timeline */}
        <div className="space-y-6">
          <section className={panelClass}>
            <p className={panelTitleClass}>Facts</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 font-mono text-[12px]">
              <MetaRow label="created" value={new Date(details.createdAt).toLocaleString()} />
              <MetaRow label="updated" value={new Date(details.updatedAt).toLocaleString()} />
              {details.description ? <MetaRow label="description" value={details.description} /> : null}
              <MetaRow label="sender" value={`${details.sender.name} · ${details.sender.phone} · ${details.sender.address}`} />
              {details.sender.email ? <MetaRow label="sender email" value={details.sender.email} /> : null}
              <MetaRow label="receiver" value={`${details.receiver.name} · ${details.receiver.phone} · ${details.receiver.address}`} />
              {details.receiver.email ? <MetaRow label="receiver email" value={details.receiver.email} /> : null}
              {details.specifications.size ? <MetaRow label="size" value={details.specifications.size} /> : null}
              {details.specifications.weight !== undefined ? <MetaRow label="weight" value={`${details.specifications.weight} kg`} /> : null}
              {details.payment.paymentMethod ? <MetaRow label="payment method" value={details.payment.paymentMethod} /> : null}
              <MetaRow label="payment status" value={details.payment.paymentStatus} />
              {details.payment.shippingCost ? <MetaRow label="shipping cost" value={String(details.payment.shippingCost)} /> : null}
              {details.delivery.estimatedDeliveryDate ? <MetaRow label="est. delivery" value={new Date(details.delivery.estimatedDeliveryDate).toLocaleDateString()} /> : null}
              {details.currentLocation ? (
                <MetaRow
                  label="current location"
                  value={`${details.currentLocation.locationName ?? "coordinates"} (${details.currentLocation.latitude.toFixed(4)}, ${details.currentLocation.longitude.toFixed(4)}) · ${new Date(details.currentLocation.updatedAt).toLocaleString()}`}
                />
              ) : null}
            </dl>
          </section>

          <section className={panelClass}>
            <p className={panelTitleClass}>Status history ({details.statusHistory.length})</p>
            <ol className="relative space-y-4 border-l border-line pl-5">
              {details.statusHistory.map((event, index) => (
                <li key={`${event.occurredAt}-${index}`} className="relative">
                  <span className="absolute top-1.5 -left-[26px] h-2.5 w-2.5 border border-line bg-ink">
                    <span className="absolute inset-0.5 bg-signal" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={event.status} />
                    <span className="font-mono text-[10px] text-dim">{new Date(event.occurredAt).toLocaleString()}</span>
                  </div>
                  {event.note ? <p className="mt-1 font-mono text-[11px] text-fog">{event.note}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
