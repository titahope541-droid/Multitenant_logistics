"use client";

/**
 * Platform-Admin tenant detail — tabbed console:
 *   Overview · Website · Branding · Admin · Packages · Settings
 * Accessible tabs (roving buttons + aria-selected + panel labelling).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, KeyRound, Loader2, RotateCcw } from "lucide-react";
import { ApiClientError } from "@/services/api-client";
import * as tenantsService from "@/services/tenants";
import { getWebsiteConfig, listTenantPackages } from "@/services/website";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { CredentialsDisplay } from "@/components/admin/credentials-display";
import { WebsiteEditor } from "@/components/admin/website-editor";
import { BrandingEditor } from "@/components/admin/branding-editor";
import { Panel, StatusPill, TextField } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import type { TenantDetails } from "@/types/tenant";
import type { TenantPackageSummary, Paginated } from "@/types/tenant";
import type { PublicWebsiteData } from "@/types/website";

const TABS = ["Overview", "Website", "Branding", "Admin", "Packages", "Settings"] as const;
type Tab = (typeof TABS)[number];

export function TenantDetail({
  initialDetails,
  initialWebsite,
  platformDomain,
}: {
  initialDetails: TenantDetails;
  initialWebsite: PublicWebsiteData;
  platformDomain: string;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [details, setDetails] = useState(initialDetails);
  const [website] = useState(initialWebsite);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reset, setReset] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [packages, setPackages] = useState<Paginated<TenantPackageSummary> | null>(null);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [companyName, setCompanyName] = useState(details.tenant.companyName);
  const [phone, setPhone] = useState(details.tenant.contact.phone ?? "");
  const [email, setEmail] = useState(details.tenant.contact.email ?? "");
  const [address, setAddress] = useState(details.tenant.contact.address ?? "");
  const [savingIdentity, setSavingIdentity] = useState(false);

  const tenantId = details.tenant.id;
  const siteUrl = `${details.tenant.slug}.${platformDomain}`;

  const loadPackages = useCallback(async () => {
    setLoadingPackages(true);
    try {
      setPackages(await listTenantPackages(tenantId));
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Unexpected error.");
    } finally {
      setLoadingPackages(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tab === "Packages" && !packages && !loadingPackages) void loadPackages();
  }, [tab, packages, loadingPackages, loadPackages]);

  function run(action: () => Promise<TenantDetails>, note: string) {
    return async () => {
      setError(null);
      try {
        setDetails(await action());
        setMessage(note);
      } catch (cause) {
        setError(cause instanceof ApiClientError ? cause.message : "Unexpected error.");
      }
    };
  }

  async function saveIdentity() {
    setSavingIdentity(true);
    setError(null);
    setMessage(null);
    try {
      setDetails(
        await tenantsService.updateTenant(tenantId, {
          companyName,
          contact: { phone, email, address },
        }),
      );
      setMessage("Company information saved.");
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Unexpected error.");
    } finally {
      setSavingIdentity(false);
    }
  }

  const lifecycle =
    details.tenant.status === "ACTIVE" ? (
      <>
        <ConfirmButton confirmLabel="Confirm suspend — public site & tracking go dark" onConfirm={run(() => tenantsService.suspendTenant(tenantId), "Tenant suspended.")}>
          Suspend
        </ConfirmButton>
        <ConfirmButton confirmLabel="Confirm archive — hidden from lists, data retained" tone="danger" onConfirm={run(() => tenantsService.archiveTenant(tenantId), "Tenant archived.")}>
          Archive
        </ConfirmButton>
      </>
    ) : (
      <>
        <ConfirmButton confirmLabel="Confirm restore" onConfirm={run(() => tenantsService.restoreTenant(tenantId), "Tenant restored to ACTIVE.")}>
          <RotateCcw className="h-3 w-3" /> Restore
        </ConfirmButton>
        {details.tenant.status === "SUSPENDED" ? (
          <ConfirmButton confirmLabel="Confirm archive" tone="danger" onConfirm={run(() => tenantsService.archiveTenant(tenantId), "Tenant archived.")}>
            Archive
          </ConfirmButton>
        ) : null}
      </>
    );

  return (
    <div className="space-y-6">
      <Link href="/admin/tenants" className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-dim uppercase transition-colors hover:text-paper">
        <ArrowLeft className="h-3 w-3" /> All tenants
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-paper sm:text-3xl">{details.tenant.companyName}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[12px] text-dim">
            {siteUrl}
            <StatusPill status={details.tenant.status} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/tenants/${tenantId}/preview`}
            className="inline-flex items-center gap-2 border border-line px-3 py-1.5 font-mono text-[9.5px] tracking-[0.15em] text-fog uppercase transition-colors hover:border-paper/40 hover:text-paper"
          >
            <ExternalLink className="h-3 w-3" /> Preview website
          </Link>
          {lifecycle}
        </div>
      </header>

      {message ? <p role="status" className="border-l-2 border-mint px-3 py-2 font-mono text-[11px] text-mint">{message}</p> : null}
      {error ? <p role="alert" className="border-l-2 border-crimson px-3 py-2 font-mono text-[11px] text-crimson">{error}</p> : null}

      {/* tabs */}
      <div role="tablist" aria-label="Tenant sections" className="flex flex-wrap gap-px border border-line bg-line">
        {TABS.map((name) => (
          <button
            key={name}
            role="tab"
            id={`tab-${name}`}
            aria-selected={tab === name}
            aria-controls={`panel-${name}`}
            onClick={() => setTab(name)}
            className={cn(
              "px-4 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors",
              tab === name ? "bg-paper text-ink" : "bg-panel text-fog hover:text-paper",
            )}
          >
            {name}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "Overview" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Company information">
              <div className="space-y-4">
                <TextField label="Company name" value={companyName} onChange={setCompanyName} />
                <TextField label="Phone" value={phone} onChange={setPhone} />
                <TextField label="Email" type="email" value={email} onChange={setEmail} />
                <TextField label="Address" value={address} onChange={setAddress} />
                <button
                  onClick={saveIdentity}
                  disabled={savingIdentity}
                  className="inline-flex items-center gap-2 border border-paper/25 bg-paper px-4 py-2.5 font-mono text-[10px] font-medium tracking-[0.2em] text-ink uppercase transition-colors hover:border-signal hover:bg-signal disabled:opacity-50"
                >
                  {savingIdentity ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Save company info
                </button>
              </div>
            </Panel>
            <Panel title="Facts">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono text-[12px]">
                <dt className="text-dim">subdomain</dt><dd className="text-paper">{siteUrl}</dd>
                <dt className="text-dim">status</dt><dd><StatusPill status={details.tenant.status} /></dd>
                <dt className="text-dim">tenant admin</dt><dd className="text-paper">{details.admin ? `${details.admin.name} · ${details.admin.email}` : "—"}</dd>
                <dt className="text-dim">packages</dt><dd className="text-paper">{details.packageCount}</dd>
                <dt className="text-dim">website</dt><dd className="text-paper">{details.websiteConfigured ? "configured" : "defaults"}</dd>
                <dt className="text-dim">created</dt><dd className="text-paper">{new Date(details.tenant.createdAt).toLocaleString()}</dd>
                <dt className="text-dim">updated</dt><dd className="text-paper">{new Date(details.tenant.updatedAt).toLocaleString()}</dd>
              </dl>
            </Panel>
          </div>
        ) : null}

        {tab === "Website" ? <WebsiteEditor tenantId={tenantId} initial={website} /> : null}

        {tab === "Branding" ? (
          <BrandingEditor
            tenantId={tenantId}
            companyName={details.tenant.companyName}
            initial={website.branding}
          />
        ) : null}

        {tab === "Admin" ? (
          <Panel title="Tenant admin account">
            {details.admin ? (
              <div className="space-y-4">
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono text-[12px]">
                  <dt className="text-dim">name</dt><dd className="text-paper">{details.admin.name}</dd>
                  <dt className="text-dim">username / email</dt><dd className="text-paper">{details.admin.email}</dd>
                  <dt className="text-dim">status</dt><dd className="text-paper">{details.admin.status}</dd>
                  <dt className="text-dim">password</dt><dd className="text-dim">stored as an Argon2id hash — never retrievable</dd>
                </dl>
                <ConfirmButton
                  confirmLabel="Confirm reset — signs the admin out everywhere"
                  tone="danger"
                  onConfirm={async () => {
                    const result = await tenantsService.resetTenantAdminPassword(tenantId);
                    setReset({ email: result.admin.email, temporaryPassword: result.temporaryPassword });
                  }}
                >
                  <KeyRound className="h-3 w-3" /> Reset password
                </ConfirmButton>
                {reset ? (
                  <CredentialsDisplay
                    title="Password reset — one-time credentials"
                    rows={[{ label: "admin email", value: reset.email }]}
                    temporaryPassword={reset.temporaryPassword}
                  />
                ) : null}
              </div>
            ) : (
              <p className="font-mono text-[11px] text-dim">No tenant admin on record.</p>
            )}
          </Panel>
        ) : null}

        {tab === "Packages" ? (
          <Panel title="Packages — platform read-only view">
            <p className="mb-4 font-mono text-[10.5px] leading-4 text-dim">
              Server-authorized Platform-Admin view of this tenant&apos;s shipments.
              You remain a Platform Admin — no impersonation, no session swap.
              Package operations stay with the tenant&apos;s own admin.
            </p>
            {loadingPackages ? (
              <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading
              </p>
            ) : packages && packages.items.length > 0 ? (
              <div className="overflow-x-auto border border-line">
                <table className="w-full min-w-[620px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line bg-ink text-left">
                      {["Tracking ID", "Package", "Status", "Receiver", "Created"].map((h) => (
                        <th key={h} className="px-3 py-2.5 font-mono text-[9.5px] tracking-[0.18em] text-dim uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {packages.items.map((pkg) => (
                      <tr key={pkg.id} className="border-b border-line last:border-b-0">
                        <td className="px-3 py-2.5 font-mono text-[11.5px] text-signal">{pkg.trackingId}</td>
                        <td className="px-3 py-2.5 text-paper">{pkg.packageName}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-fog">{pkg.status}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-fog">{pkg.receiverName}</td>
                        <td className="px-3 py-2.5 font-mono text-[10.5px] text-dim">{new Date(pkg.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="font-mono text-[11px] text-dim">No packages yet for this tenant.</p>
            )}
          </Panel>
        ) : null}

        {tab === "Settings" ? (
          <Panel title="Lifecycle & derived state">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono text-[12px]">
              <dt className="text-dim">tenant status</dt><dd><StatusPill status={details.tenant.status} /></dd>
              <dt className="text-dim">public website</dt><dd className={details.tenant.status === "ACTIVE" ? "text-mint" : "text-amber"}>{details.tenant.status === "ACTIVE" ? "enabled" : "disabled (generic unavailable page)"}</dd>
              <dt className="text-dim">public tracking</dt><dd className={details.tenant.status === "ACTIVE" ? "text-mint" : "text-amber"}>{details.tenant.status === "ACTIVE" ? "enabled" : "disabled"}</dd>
              <dt className="text-dim">tenant admin login</dt><dd className={details.tenant.status === "ACTIVE" ? "text-mint" : "text-amber"}>{details.tenant.status === "ACTIVE" ? "allowed" : "blocked"}</dd>
              <dt className="text-dim">data</dt><dd className="text-paper">always retained — there is no hard delete</dd>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">{lifecycle}</div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
