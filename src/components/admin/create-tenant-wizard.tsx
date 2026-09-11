"use client";

/**
 * Tenant provisioning wizard — Step 1 Company → Step 2 Tenant Admin →
 * Step 3 Website/summary. Submits ONE atomic request; all validation,
 * transactions, hashing, and uniqueness enforcement happen server-side.
 */

import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { ApiClientError } from "@/services/api-client";
import { createTenant, type CreateTenantPayload } from "@/services/tenants";
import { CredentialsDisplay } from "@/components/admin/credentials-display";
import type { TenantCreationResult } from "@/types/tenant";

function suggestSlug(companyName: string): string {
  return companyName
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

const EMPTY_DRAFT: Draft = {
  companyName: "",
  slug: "",
  phone: "",
  companyEmail: "",
  address: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

export function CreateTenantWizard({ onCreated }: { onCreated: () => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<TenantCreationResult | null>(null);

  const effectiveSlug = useMemo(
    () => (slugTouched ? draft.slug : suggestSlug(draft.companyName)),
    [draft.companyName, draft.slug, slugTouched],
  );

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function buildPayload(): CreateTenantPayload {
    const contact = {
      ...(draft.phone.trim() ? { phone: draft.phone.trim() } : {}),
      ...(draft.companyEmail.trim() ? { email: draft.companyEmail.trim() } : {}),
      ...(draft.address.trim() ? { address: draft.address.trim() } : {}),
    };
    return {
      companyName: draft.companyName.trim(),
      slug: effectiveSlug,
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
      const result = await createTenant(buildPayload());
      setCreated(result);
      setDraft(EMPTY_DRAFT);
      setSlugTouched(false);
      onCreated();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="border border-line bg-panel p-5 sm:p-6">
        <CredentialsDisplay
          title="Tenant provisioned — one-time credentials"
          rows={[
            { label: "company", value: created.tenant.companyName },
            { label: "subdomain", value: `${created.tenant.slug}.yourplatform.com` },
            { label: "admin email", value: created.admin.email },
          ]}
          temporaryPassword={
            created.temporaryPassword ?? "(set by you during creation — not stored, not shown)"
          }
        />
        <button
          onClick={() => setCreated(null)}
          className="mt-4 border border-line px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-fog uppercase transition-colors hover:border-paper/40 hover:text-paper"
        >
          Create another tenant
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full border border-line bg-ink px-3.5 py-2.5 text-sm text-paper outline-none transition-colors placeholder:text-dim/60 focus:border-signal";
  const labelClass = "mb-1.5 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase";

  return (
    <div className="border border-line bg-panel">
      <div className="flex items-center gap-1 border-b border-line px-5 py-3">
        {STEPS.map((label, index) => (
          <span key={label} className="flex items-center">
            <span
              className={`font-mono text-[10px] tracking-[0.18em] uppercase ${
                index === step ? "text-signal" : index < step ? "text-fog" : "text-dim"
              }`}
            >
              {index + 1}. {label}
            </span>
            {index < STEPS.length - 1 ? <span className="mx-3 text-dim">→</span> : null}
          </span>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4 p-5 sm:p-6">
        {step === 0 ? (
          <>
            <label className="block">
              <span className={labelClass}>Company name *</span>
              <input required value={draft.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Swift Logistics Ltd." className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Subdomain *</span>
              <div className="flex items-center gap-2">
                <input
                  required
                  value={effectiveSlug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value);
                  }}
                  placeholder="swift-logistics"
                  className={inputClass}
                />
                <span className="font-mono text-[11px] whitespace-nowrap text-dim">.yourplatform.com</span>
              </div>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Company phone</span>
                <input value={draft.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+234 …" className={inputClass} />
              </label>
              <label className="block">
                <span className={labelClass}>Company email</span>
                <input type="email" value={draft.companyEmail} onChange={(e) => set("companyEmail", e.target.value)} placeholder="ops@swift.com" className={inputClass} />
              </label>
            </div>
            <label className="block">
              <span className={labelClass}>Address</span>
              <input value={draft.address} onChange={(e) => set("address", e.target.value)} placeholder="21 Marina Rd, Lagos" className={inputClass} />
            </label>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <label className="block">
              <span className={labelClass}>Admin name *</span>
              <input required value={draft.adminName} onChange={(e) => set("adminName", e.target.value)} placeholder="Adaeze Okafor" className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Admin email *</span>
              <input required type="email" value={draft.adminEmail} onChange={(e) => set("adminEmail", e.target.value)} placeholder="adaeze@swift.com" className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Temporary password (optional)</span>
              <input
                value={draft.adminPassword}
                onChange={(e) => set("adminPassword", e.target.value)}
                placeholder="Leave empty — the server generates one"
                className={inputClass}
              />
            </label>
            <p className="font-mono text-[10px] leading-4 text-dim">
              Exactly one tenant admin is created per tenant. The password is
              Argon2id-hashed server-side; if left empty, a secure temporary
              password is generated and shown to you once.
            </p>
          </>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3 font-mono text-[12px] leading-6">
            <p className="text-[10px] tracking-[0.2em] text-dim uppercase">Review & provision</p>
            <p className="text-paper">
              {draft.companyName || "—"} <span className="text-dim">→</span>{" "}
              <span className="text-signal">{effectiveSlug || "—"}.yourplatform.com</span>
            </p>
            <p className="text-fog">
              admin: {draft.adminName || "—"} &lt;{draft.adminEmail || "—"}&gt;
              {draft.adminPassword ? " · password provided" : " · password will be generated"}
            </p>
            <p className="border-l-2 border-signal pl-3 text-[11px] leading-5 text-dim">
              Creates, atomically: the tenant, exactly one TENANT_ADMIN user
              (ACTIVE), and the initialized default WebsiteConfig — hero,
              tracking, services and about sections, with your contact
              details carried over. Branding is customized later by the
              Platform Admin.
            </p>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="border-l-2 border-crimson px-3 py-2 font-mono text-[11px] leading-5 text-crimson">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || busy}
            className="inline-flex items-center gap-2 border border-line px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-fog uppercase transition-colors hover:border-paper/40 hover:text-paper disabled:opacity-40"
          >
            <ArrowLeft className="h-3 w-3" /> Back
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 border border-paper/25 bg-paper px-4 py-2 font-mono text-[10px] font-medium tracking-[0.2em] text-ink uppercase transition-colors hover:border-signal hover:bg-signal disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {step < 2 ? (
              <>
                Continue <ArrowRight className="h-3 w-3" />
              </>
            ) : (
              "Provision tenant"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
