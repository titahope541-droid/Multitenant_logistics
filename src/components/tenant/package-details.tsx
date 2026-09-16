"use client";

/**
 * Package detail — the tenant admin's working view of one shipment:
 * summary, customer sharing, status control, map-driven location control,
 * and both histories. All data and actions are tenant-scoped server-side.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, PackageIcon } from "lucide-react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { LocationPicker } from "@/components/maps/location-picker";
import { ShareActions } from "@/components/shared/share-actions";
import {
  Card,
  CardHeader,
  ErrorNote,
  Field,
  Input,
  LoadingState,
  Mono,
  SectionCard,
  Select,
  StatusBadge,
  SuccessNote,
  Button,
} from "@/components/ui";
import { ApiClientError } from "@/services/api-client";
import * as packagesService from "@/services/packages";
import { PACKAGE_STATUSES, PACKAGE_STATUS_META, type PackageStatus } from "@/types/domain";
import type { AdminPackageDetails } from "@/types/package";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-hair py-2.5 last:border-b-0">
      <dt className="shrink-0 text-[12.5px] text-muted">{label}</dt>
      <dd className="text-right text-[13.5px] font-medium break-words text-slate">{value}</dd>
    </div>
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
  const [flash, setFlash] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<PackageStatus | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"status" | "location" | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDetails(await packagesService.getPackageDetails(packageId));
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Could not load this package.");
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(
    kind: "status" | "location",
    action: () => Promise<AdminPackageDetails>,
    okMessage: string,
  ) {
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

  if (loading) return <LoadingState label="Loading package…" />;
  if (!details) return <ErrorNote>{error ?? "Package could not be loaded."}</ErrorNote>;

  const { currentLocation } = details;

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/packages"
        className="inline-flex items-center gap-2 text-[13px] font-medium text-body transition-colors hover:text-slate"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All packages
      </Link>

      {/* Header card */}
      <Card className="px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-slate">
                <Mono className="text-[20px]">{details.trackingId}</Mono>
              </h1>
              <StatusBadge status={details.status} withStep />
              {details.archived ? (
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] font-medium text-muted ring-1 ring-hair-strong ring-inset">
                  Archived
                </span>
              ) : null}
            </div>
            <p className="mt-2 flex items-center gap-2 text-[14px] text-body">
              <PackageIcon className="h-4 w-4 text-muted" strokeWidth={1.75} aria-hidden="true" />
              {details.packageName}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {details.archived ? (
              <ConfirmButton
                confirmLabel="Confirm restore"
                onConfirm={async () => {
                  setDetails(await packagesService.restorePackage(details.id));
                  setFlash("Package restored.");
                }}
              >
                Restore package
              </ConfirmButton>
            ) : (
              <ConfirmButton
                confirmLabel="Confirm archive"
                tone="danger"
                onConfirm={async () => {
                  setDetails(await packagesService.archivePackage(details.id));
                  setFlash("Package archived — history retained.");
                }}
              >
                Archive package
              </ConfirmButton>
            )}
          </div>
        </div>
      </Card>

      {flash ? <SuccessNote>{flash}</SuccessNote> : null}
      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {/* Customer sharing */}
      <SectionCard
        title="Customer tracking"
        description="Share the tracking ID or link — only the company name, ID and public link are included."
      >
        <ShareActions trackingId={details.trackingId} companyName={companyName} slug={slug} />
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Operations column */}
        <div className="space-y-5">
          <SectionCard title="Update status">
            {details.archived ? (
              <p className="text-[13px] text-muted">Restore this package to change its status.</p>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!newStatus) return;
                  const chosen = newStatus;
                  void run(
                    "status",
                    () =>
                      packagesService.changePackageStatus(details.id, {
                        status: chosen,
                        ...(note.trim() ? { note: note.trim() } : {}),
                      }),
                    `Status updated to ${PACKAGE_STATUS_META[chosen].label}.`,
                  );
                  setNewStatus("");
                  setNote("");
                }}
              >
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Field label="New status" htmlFor="new-status" required>
                    <Select
                      id="new-status"
                      required
                      value={newStatus}
                      onChange={(event) => setNewStatus(event.target.value as PackageStatus)}
                    >
                      <option value="" disabled>
                        Choose a status…
                      </option>
                      {PACKAGE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {PACKAGE_STATUS_META[status].label} (step {PACKAGE_STATUS_META[status].step})
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Button type="submit" variant="primary" loading={busy === "status"} disabled={!newStatus}>
                    Apply
                  </Button>
                </div>
                <Field label="Note" htmlFor="status-note" hint="Optional, shown on the customer timeline.">
                  <Input
                    id="status-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="e.g. Left the Lagos facility"
                  />
                </Field>
              </form>
            )}
          </SectionCard>

          <SectionCard
            title="Update location"
            description="Search, click the map, or drag the marker — nothing saves until you confirm."
          >
            {details.archived ? (
              <p className="text-[13px] text-muted">Restore this package to update its location.</p>
            ) : (
              <LocationPicker
                initial={currentLocation}
                busy={busy !== null}
                onConfirm={async (input) => {
                  await run(
                    "location",
                    () => packagesService.updatePackageLocation(details.id, input),
                    "Location updated — customers tracking this package saw it instantly.",
                  );
                }}
              />
            )}
          </SectionCard>
        </div>

        {/* Facts + history column */}
        <div className="space-y-5">
          <SectionCard title="Shipment details">
            <dl>
              <Row label="Created" value={new Date(details.createdAt).toLocaleString()} />
              <Row label="Last updated" value={new Date(details.updatedAt).toLocaleString()} />
              {details.description ? <Row label="Description" value={details.description} /> : null}
              <Row
                label="Sender"
                value={
                  <>
                    {details.sender.name}
                    <span className="block text-[12px] font-normal text-muted">
                      {details.sender.phone} · {details.sender.address}
                    </span>
                  </>
                }
              />
              <Row
                label="Receiver"
                value={
                  <>
                    {details.receiver.name}
                    <span className="block text-[12px] font-normal text-muted">
                      {details.receiver.phone} · {details.receiver.address}
                    </span>
                  </>
                }
              />
              {details.specifications.size ? <Row label="Size" value={details.specifications.size} /> : null}
              {details.specifications.weight !== undefined ? (
                <Row label="Weight" value={`${details.specifications.weight} kg`} />
              ) : null}
              {details.payment.paymentMethod ? (
                <Row label="Payment method" value={details.payment.paymentMethod} />
              ) : null}
              <Row label="Payment status" value={details.payment.paymentStatus} />
              {details.payment.shippingCost ? (
                <Row label="Shipping cost" value={String(details.payment.shippingCost)} />
              ) : null}
              {details.delivery.estimatedDeliveryDate ? (
                <Row
                  label="Estimated delivery"
                  value={new Date(details.delivery.estimatedDeliveryDate).toLocaleDateString()}
                />
              ) : null}
              <Row
                label="Current location"
                value={
                  currentLocation ? (
                    <>
                      {currentLocation.locationName ?? "Coordinates only"}
                      <span className="block text-[12px] font-normal text-muted">
                        <Mono>
                          {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                        </Mono>{" "}
                        · {new Date(currentLocation.updatedAt).toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted">Not set</span>
                  )
                }
              />
            </dl>
          </SectionCard>

          <Card>
            <CardHeader title="Status history" description={`${details.statusHistory.length} events`} />
            <div className="px-5 py-5 sm:px-6">
              <ol className="relative space-y-5 border-l border-hair pl-5">
                {details.statusHistory.map((event, index) => (
                  <li key={`${event.occurredAt}-${index}`} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 -left-[23px] h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-surface"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={event.status} />
                      <span className="text-[12px] text-muted">
                        {new Date(event.occurredAt).toLocaleString()}
                      </span>
                    </div>
                    {event.note ? <p className="mt-1 text-[13px] text-body">{event.note}</p> : null}
                  </li>
                ))}
              </ol>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Location history"
              description={`${details.locationHistory.length} records — internal only`}
            />
            <div className="px-5 py-5 sm:px-6">
              {details.locationHistory.length === 0 ? (
                <p className="text-[13px] text-muted">No location records yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {details.locationHistory.map((row, index) => (
                    <li
                      key={`${row.recordedAt}-${index}`}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-hair pb-2.5 text-[13px] last:border-b-0 last:pb-0"
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                      <span className="font-medium text-slate">{row.locationName ?? "Coordinates"}</span>
                      <Mono className="text-muted">
                        {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}
                      </Mono>
                      <span className="ml-auto text-[12px] text-muted">
                        {new Date(row.recordedAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
