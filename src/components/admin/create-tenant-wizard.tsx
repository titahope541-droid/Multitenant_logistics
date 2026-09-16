"use client";

/**
 * Tenant provisioning wizard — Company → Tenant admin → Initialize website.
 * One atomic request; all validation, transactions, hashing and uniqueness
 * enforcement happen server-side.
 */

import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { CredentialsDisplay } from "@/components/admin/credentials-display";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  buttonClasses,
} from "@/components/ui";
import { ApiClientError } from "@/services/api-client";
import { createTenant, type CreateTenantPayload } from "@/services/tenants";
import { cn } from "@/lib/utils";
import type { TenantCreationResult } from "@/types/tenant";

const STEPS = ["Company", "Tenant admin", "Initialize website"] as const;

interface Draft {
  companyName: string;
  slug: string;
  phone: string;
  companyEmail: string;
  address: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

const EMPTY: Draft = {
  companyName: "",
  slug: "",
  phone: "",
  companyEmail: "",
  address: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

function suggestSlug(companyName: string): string {
  return companyName
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateTenantWizard({ onCreated }: { onCreated: () => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<TenantCreationResult | null>(null);

  const slug = useMemo(
    () => (slugTouched ? draft.slug : suggestSlug(draft.companyName)),
    [draft.companyName, draft.slug, slugTouched],
  );

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function payload(): CreateTenantPayload {
    const contact = {
      ...(draft.phone.trim() ? { phone: draft.phone.trim() } : {}),
      ...(draft.companyEmail.trim() ? { email: draft.companyEmail.trim() } : {}),
      ...(draft.address.trim() ? { address: draft.address.trim() } : {}),
    };
    return {
      companyName: draft.companyName.trim(),
      slug,
      ...(Object.keys(contact).length > 0 ? { contact } : {}),
      admin: {
        name: draft.adminName.trim(),
        email: draft.adminEmail.trim(),
        ...(draft.adminPassword ? { password: draft.adminPassword } : {}),
      },
    };
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setCreated(await createTenant(payload()));
      setDraft(EMPTY);
      setSlugTouched(false);
      onCreated();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Could not create the tenant.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <Card className="p-5 sm:p-6">
        <CredentialsDisplay
          title="Tenant provisioned"
          rows={[
            { label: "Company", value: created.tenant.companyName },
            { label: "Subdomain", value: created.tenant.slug },
            { label: "Admin email", value: created.admin.email },
          ]}
          temporaryPassword={
            created.temporaryPassword ?? "(set by you during creation — not stored)"
          }
        />
        <button
          type="button"
          onClick={() => {
            setCreated(null);
            setStep(0);
          }}
          className={cn(buttonClasses("secondary"), "mt-5")}
        >
          Create another tenant
        </button>
      </Card>
    );
  }

  return (
    <Card>
      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-hair px-5 py-4 sm:px-6">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[11.5px] font-semibold",
                index === step
                  ? "bg-accent text-white"
                  : index < step
                    ? "bg-ok-soft text-ok"
                    : "bg-surface-2 text-muted",
              )}
              aria-hidden="true"
            >
              {index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "text-[13px]",
                index === step ? "font-semibold text-slate" : "text-muted",
              )}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      <form onSubmit={onSubmit} className="space-y-4 px-5 py-5 sm:px-6">
        {step === 0 ? (
          <>
            <Field label="Company name" htmlFor="company-name" required>
              <Input
                id="company-name"
                required
                value={draft.companyName}
                onChange={(event) => set("companyName", event.target.value)}
                placeholder="Swift Logistics Ltd."
              />
            </Field>
            <Field
              label="Subdomain"
              htmlFor="company-slug"
              hint="Becomes the tenant's public address."
              required
            >
              <Input
                id="company-slug"
                required
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  set("slug", event.target.value);
                }}
                placeholder="swift-logistics"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company phone" htmlFor="company-phone">
                <Input
                  id="company-phone"
                  value={draft.phone}
                  onChange={(event) => set("phone", event.target.value)}
                />
              </Field>
              <Field label="Company email" htmlFor="company-email">
                <Input
                  id="company-email"
                  type="email"
                  value={draft.companyEmail}
                  onChange={(event) => set("companyEmail", event.target.value)}
                />
              </Field>
            </div>
            <Field label="Address" htmlFor="company-address">
              <Input
                id="company-address"
                value={draft.address}
                onChange={(event) => set("address", event.target.value)}
              />
            </Field>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Field label="Admin name" htmlFor="admin-name" required>
              <Input
                id="admin-name"
                required
                value={draft.adminName}
                onChange={(event) => set("adminName", event.target.value)}
              />
            </Field>
            <Field label="Admin email" htmlFor="admin-email" required>
              <Input
                id="admin-email"
                type="email"
                required
                value={draft.adminEmail}
                onChange={(event) => set("adminEmail", event.target.value)}
              />
            </Field>
            <Field
              label="Temporary password"
              htmlFor="admin-password"
              hint="Leave empty and the server generates one, shown to you once."
            >
              <Input
                id="admin-password"
                value={draft.adminPassword}
                onChange={(event) => set("adminPassword", event.target.value)}
                placeholder="Generated automatically"
              />
            </Field>
            <p className="text-[12.5px] text-muted">
              Exactly one tenant admin is created per company. The password is hashed with
              Argon2id and is never retrievable.
            </p>
          </>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3 text-[13.5px] leading-6">
            <p className="text-[12.5px] font-medium tracking-wide text-muted uppercase">
              Review &amp; provision
            </p>
            <p className="text-slate">
              <span className="font-semibold">{draft.companyName || "—"}</span>{" "}
              <span className="text-muted">→</span>{" "}
              <span className="font-mono text-accent">{slug || "—"}</span>
            </p>
            <p className="text-body">
              Admin: {draft.adminName || "—"} &lt;{draft.adminEmail || "—"}&gt;
              {draft.adminPassword ? " · password provided" : " · password will be generated"}
            </p>
            <p className="rounded-lg bg-surface-2 px-3.5 py-3 text-[13px] text-body">
              Creates, atomically: the tenant, exactly one tenant admin, and the default website
              configuration (hero, tracking, services and about sections) with your contact details
              carried over. Branding is customized afterwards on the Branding tab.
            </p>
          </div>
        ) : null}

        {error ? <ErrorNote>{error}</ErrorNote> : null}

        <div className="flex items-center justify-between border-t border-hair pt-4">
          <button
            type="button"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0 || busy}
            className={buttonClasses("secondary")}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          <Button type="submit" variant="primary" loading={busy}>
            {step < 2 ? (
              <>
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            ) : (
              "Provision tenant"
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
