"use client";

/**
 * Package creation form — structured sections matching the create schema.
 * On success the server mints the tracking ID; we show it prominently with
 * copy affordances. paymentMethod is FREE TEXT by locked decision.
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, MapPin, PackageCheck } from "lucide-react";
import { ApiClientError } from "@/services/api-client";
import { createPackage } from "@/services/packages";
import { ShareActions } from "@/components/shared/share-actions";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/types/domain";
import type { AdminPackageDetails, CreatePackagePayload, PartyDetailsDto } from "@/types/package";

const inputClass =
  "w-full border border-line bg-ink px-3.5 py-2.5 text-sm text-paper outline-none transition-colors placeholder:text-dim/60 focus:border-signal";
const labelClass = "mb-1.5 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase";
const sectionClass = "border border-line bg-panel p-5 sm:p-6";
const sectionTitleClass = "mb-4 font-mono text-[10px] tracking-[0.25em] text-signal uppercase";

interface PartyDraft {
  name: string;
  phone: string;
  email: string;
  address: string;
}

const EMPTY_PARTY: PartyDraft = { name: "", phone: "", email: "", address: "" };

function PartySection({
  title,
  value,
  onChange,
}: {
  title: string;
  value: PartyDraft;
  onChange: (value: PartyDraft) => void;
}) {
  return (
    <fieldset className={sectionClass}>
      <legend className="sr-only">{title}</legend>
      <p className={sectionTitleClass}>{title}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Name *</span>
          <input required value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Phone *</span>
          <input required value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} className={inputClass} />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Email</span>
          <input type="email" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} className={inputClass} />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Address *</span>
          <input required value={value.address} onChange={(e) => onChange({ ...value, address: e.target.value })} className={inputClass} />
        </label>
      </div>
    </fieldset>
  );
}

function toParty(draft: PartyDraft): PartyDetailsDto {
  return {
    name: draft.name.trim(),
    phone: draft.phone.trim(),
    ...(draft.email.trim() ? { email: draft.email.trim() } : {}),
    address: draft.address.trim(),
  };
}

export function PackageCreateForm({
  companyName,
  slug,
}: {
  companyName: string;
  slug: string;
}) {
  const router = useRouter();
  const [packageName, setPackageName] = useState("");
  const [description, setDescription] = useState("");
  const [sender, setSender] = useState(EMPTY_PARTY);
  const [receiver, setReceiver] = useState(EMPTY_PARTY);
  const [size, setSize] = useState("");
  const [weight, setWeight] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("UNPAID");
  const [shippingCost, setShippingCost] = useState("");
  const [estimatedDate, setEstimatedDate] = useState("");
  const [withLocation, setWithLocation] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationName, setLocationName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<AdminPackageDetails | null>(null);
  const [copied, setCopied] = useState(false);

  function buildPayload(): CreatePackagePayload {
    return {
      packageName: packageName.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      sender: toParty(sender),
      receiver: toParty(receiver),
      ...(size.trim() || weight.trim()
        ? {
            specifications: {
              ...(size.trim() ? { size: size.trim() } : {}),
              ...(weight.trim() ? { weight: Number(weight) } : {}),
            },
          }
        : {}),
      ...(paymentMethod.trim() || shippingCost.trim()
        ? {
            payment: {
              ...(paymentMethod.trim() ? { paymentMethod: paymentMethod.trim() } : {}),
              paymentStatus,
              ...(shippingCost.trim() ? { shippingCost: Number(shippingCost) } : {}),
            },
          }
        : {}),
      ...(estimatedDate ? { delivery: { estimatedDeliveryDate: new Date(estimatedDate).toISOString() } } : {}),
      ...(withLocation && latitude.trim() && longitude.trim()
        ? {
            currentLocation: {
              latitude: Number(latitude),
              longitude: Number(longitude),
              ...(locationName.trim() ? { locationName: locationName.trim() } : {}),
            },
          }
        : {}),
    };
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setCreated(await createPackage(buildPayload()));
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="border border-line bg-panel p-6 sm:p-8">
        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-mint uppercase">
          <PackageCheck className="h-4 w-4" />
          Package Created Successfully
        </p>
        <p className="mt-5 font-mono text-[10px] tracking-[0.2em] text-dim uppercase">Tracking ID</p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <span className="font-mono text-2xl font-semibold tracking-[0.08em] text-signal sm:text-3xl">
            {created.trackingId}
          </span>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(created.trackingId);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex items-center gap-2 border border-line px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-fog uppercase transition-colors hover:border-paper/40 hover:text-paper"
          >
            {copied ? <Check className="h-3 w-3 text-mint" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy Tracking ID"}
          </button>
        </div>
        <p className="mt-4 border-l-2 border-signal pl-3 font-mono text-[11px] leading-5 text-fog">
          Send this tracking ID to your customer — they can follow the
          package live on your public tracking page, no account required.
        </p>
        <div className="mt-5">
          <ShareActions
            trackingId={created.trackingId}
            companyName={companyName}
            slug={slug}
            layout="card"
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => router.push(`/dashboard/packages/${created.id}`)}
            className="border border-paper/25 bg-paper px-4 py-2.5 font-mono text-[10px] font-medium tracking-[0.2em] text-ink uppercase transition-colors hover:border-signal hover:bg-signal"
          >
            Open package details
          </button>
          <button
            onClick={() => setCreated(null)}
            className="border border-line px-4 py-2.5 font-mono text-[10px] tracking-[0.2em] text-fog uppercase transition-colors hover:border-paper/40 hover:text-paper"
          >
            Create another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <fieldset className={sectionClass}>
        <p className={sectionTitleClass}>Package information</p>
        <div className="space-y-4">
          <label className="block">
            <span className={labelClass}>Package name *</span>
            <input required value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder='e.g. "Documents — Lagos to Abuja"' className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
          </label>
        </div>
      </fieldset>

      <PartySection title="Sender" value={sender} onChange={setSender} />
      <PartySection title="Receiver" value={receiver} onChange={setReceiver} />

      <fieldset className={sectionClass}>
        <p className={sectionTitleClass}>Specifications</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Size</span>
            <input value={size} onChange={(e) => setSize(e.target.value)} placeholder='e.g. "medium carton"' className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Weight (kg)</span>
            <input type="number" min="0" step="any" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputClass} />
          </label>
        </div>
      </fieldset>

      <fieldset className={sectionClass}>
        <p className={sectionTitleClass}>Payment (metadata only — no gateway)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className={labelClass}>Method — free text</span>
            <input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Cash on Delivery" className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Status</span>
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)} className={inputClass}>
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Shipping cost</span>
            <input type="number" min="0" step="any" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} className={inputClass} />
          </label>
        </div>
      </fieldset>

      <fieldset className={sectionClass}>
        <p className={sectionTitleClass}>Delivery</p>
        <label className="block sm:max-w-64">
          <span className={labelClass}>Estimated delivery date</span>
          <input type="date" value={estimatedDate} onChange={(e) => setEstimatedDate(e.target.value)} className={inputClass} />
        </label>
      </fieldset>

      <fieldset className={sectionClass}>
        <div className="flex items-center justify-between">
          <p className={sectionTitleClass}>Initial location</p>
          <button
            type="button"
            onClick={() => setWithLocation((value) => !value)}
            className="inline-flex items-center gap-2 border border-line px-3 py-1.5 font-mono text-[9.5px] tracking-[0.18em] text-fog uppercase transition-colors hover:border-paper/40 hover:text-paper"
          >
            <MapPin className="h-3 w-3" />
            {withLocation ? "Remove" : "Add"}
          </button>
        </div>
        {withLocation ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={labelClass}>Latitude *</span>
              <input required type="number" step="any" min="-90" max="90" value={latitude} onChange={(e) => setLatitude(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Longitude *</span>
              <input required type="number" step="any" min="-180" max="180" value={longitude} onChange={(e) => setLongitude(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Location name</span>
              <input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Origin warehouse" className={inputClass} />
            </label>
            <p className="font-mono text-[10px] leading-4 text-dim sm:col-span-3">
              Recorded as the first location-history entry. Map picking
              arrives in the Maps phase — this schema is already compatible.
            </p>
          </div>
        ) : (
          <p className="font-mono text-[10px] leading-4 text-dim">Optional — set the package&apos;s starting coordinates.</p>
        )}
      </fieldset>

      {error ? (
        <p role="alert" className="border-l-2 border-crimson px-3 py-2 font-mono text-[11px] leading-5 text-crimson">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 border border-paper/25 bg-paper px-4 py-3 font-mono text-[11px] font-medium tracking-[0.2em] text-ink uppercase transition-colors hover:border-signal hover:bg-signal disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Create package — mint tracking ID
      </button>
    </form>
  );
}
