"use client";

/**
 * Create package — the same fields and validation as before, grouped into
 * readable sections instead of one long technical form.
 *
 * On success the server-minted tracking ID is shown prominently with the
 * existing share actions (copy ID / copy link / WhatsApp).
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MapPin } from "lucide-react";
import { ShareActions } from "@/components/shared/share-actions";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  Mono,
  SectionCard,
  Select,
  Textarea,
  buttonClasses,
} from "@/components/ui";
import { ApiClientError } from "@/services/api-client";
import { createPackage } from "@/services/packages";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/types/domain";
import type { CreatePackagePayload, CreatedPackageResult, PartyDetailsDto } from "@/types/package";

interface PartyDraft {
  name: string;
  phone: string;
  email: string;
  address: string;
}

const EMPTY_PARTY: PartyDraft = { name: "", phone: "", email: "", address: "" };

function PartyFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: PartyDraft;
  onChange: (value: PartyDraft) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" htmlFor={`${idPrefix}-name`} required>
        <Input
          id={`${idPrefix}-name`}
          required
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </Field>
      <Field label="Phone" htmlFor={`${idPrefix}-phone`} required>
        <Input
          id={`${idPrefix}-phone`}
          required
          value={value.phone}
          onChange={(event) => onChange({ ...value, phone: event.target.value })}
        />
      </Field>
      <Field label="Email" htmlFor={`${idPrefix}-email`} hint="Optional">
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={value.email}
          onChange={(event) => onChange({ ...value, email: event.target.value })}
        />
      </Field>
      <Field label="Address" htmlFor={`${idPrefix}-address`} required>
        <Input
          id={`${idPrefix}-address`}
          required
          value={value.address}
          onChange={(event) => onChange({ ...value, address: event.target.value })}
        />
      </Field>
    </div>
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
  const [created, setCreated] = useState<CreatedPackageResult | null>(null);

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
      ...(estimatedDate
        ? { delivery: { estimatedDeliveryDate: new Date(estimatedDate).toISOString() } }
        : {}),
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Could not create the package.");
    } finally {
      setBusy(false);
    }
  }

  /* ── Success state ── */
  if (created) {
    return (
      <Card className="overflow-hidden">
        <div className="border-b border-hair bg-ok-soft px-6 py-5">
          <p className="flex items-center gap-2 text-[13.5px] font-medium text-ok">
            <CheckCircle2 className="h-4.5 w-4.5" aria-hidden="true" />
            Package created
          </p>
        </div>
        <div className="px-6 py-6">
          <p className="text-[12.5px] font-medium text-muted">Tracking ID</p>
          <p className="mt-1.5 text-[26px] leading-tight font-semibold tracking-tight text-slate">
            <Mono className="text-[26px]">{created.trackingId}</Mono>
          </p>
          <p className="mt-3 max-w-lg text-[13.5px] leading-6 text-body">
            Send this tracking ID to your customer — they can follow the shipment live on your
            public tracking page, no account required.
          </p>

          <div className="mt-5">
            <ShareActions trackingId={created.trackingId} companyName={companyName} slug={slug} />
          </div>

          <div className="mt-7 flex flex-wrap gap-3 border-t border-hair pt-5">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/packages/${created.package.id}`)}
              className={buttonClasses("primary")}
            >
              View package
            </button>
            <button type="button" onClick={() => setCreated(null)} className={buttonClasses("secondary")}>
              Create another
            </button>
          </div>
        </div>
      </Card>
    );
  }

  /* ── Form ── */
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <SectionCard title="Package information" description="What is being shipped.">
        <div className="space-y-4">
          <Field label="Package name" htmlFor="package-name" required>
            <Input
              id="package-name"
              required
              value={packageName}
              onChange={(event) => setPackageName(event.target.value)}
              placeholder="e.g. Documents — Lagos to Abuja"
            />
          </Field>
          <Field label="Description" htmlFor="package-description" hint="Optional notes for your team.">
            <Textarea
              id="package-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Sender" description="Who is sending the package.">
        <PartyFields idPrefix="sender" value={sender} onChange={setSender} />
      </SectionCard>

      <SectionCard title="Receiver" description="Who receives the package.">
        <PartyFields idPrefix="receiver" value={receiver} onChange={setReceiver} />
      </SectionCard>

      <SectionCard title="Specifications">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Size" htmlFor="spec-size" hint="Free text, e.g. medium carton">
            <Input id="spec-size" value={size} onChange={(event) => setSize(event.target.value)} />
          </Field>
          <Field label="Weight (kg)" htmlFor="spec-weight">
            <Input
              id="spec-weight"
              type="number"
              min="0"
              step="any"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Payment" description="Shipment metadata only — no payments are processed.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Method" htmlFor="pay-method" hint="Free text">
            <Input
              id="pay-method"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              placeholder="Cash on Delivery"
            />
          </Field>
          <Field label="Status" htmlFor="pay-status">
            <Select
              id="pay-status"
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)}
            >
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Shipping cost" htmlFor="pay-cost">
            <Input
              id="pay-cost"
              type="number"
              min="0"
              step="any"
              value={shippingCost}
              onChange={(event) => setShippingCost(event.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Delivery">
        <Field label="Estimated delivery date" htmlFor="delivery-date">
          <Input
            id="delivery-date"
            type="date"
            className="sm:max-w-xs"
            value={estimatedDate}
            onChange={(event) => setEstimatedDate(event.target.value)}
          />
        </Field>
      </SectionCard>

      <SectionCard
        title="Initial location"
        description="Optional. You can also set it later with the map on the package page."
        actions={
          <button
            type="button"
            onClick={() => setWithLocation((value) => !value)}
            className={buttonClasses("secondary", "sm")}
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {withLocation ? "Remove" : "Add location"}
          </button>
        }
      >
        {withLocation ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Latitude" htmlFor="loc-lat" required>
              <Input
                id="loc-lat"
                type="number"
                step="any"
                min="-90"
                max="90"
                required
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
              />
            </Field>
            <Field label="Longitude" htmlFor="loc-lng" required>
              <Input
                id="loc-lng"
                type="number"
                step="any"
                min="-180"
                max="180"
                required
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
              />
            </Field>
            <Field label="Location name" htmlFor="loc-name">
              <Input
                id="loc-name"
                value={locationName}
                onChange={(event) => setLocationName(event.target.value)}
                placeholder="Origin warehouse"
              />
            </Field>
          </div>
        ) : (
          <p className="text-[13px] text-muted">
            No starting location set — the package will show as awaiting its first location update.
          </p>
        )}
      </SectionCard>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={busy}>
          Create package
        </Button>
        <p className="text-[12.5px] text-muted">
          The tracking ID is generated by the server — you never type one.
        </p>
      </div>
    </form>
  );
}
