"use client";

/**
 * Platform-admin tenant detail — tabbed console:
 *   Overview · Website · Branding · Admin · Packages · Settings
 * Accessible tabs (aria-selected + panel labelling), light product chrome.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, KeyRound, RotateCcw } from "lucide-react";
import { BrandingEditor } from "@/components/admin/branding-editor";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { CredentialsDisplay } from "@/components/admin/credentials-display";
import { WebsiteEditor } from "@/components/admin/website-editor";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  LoadingState,
  Mono,
  SectionCard,
  SuccessNote,
  TableShell,
  Td,
  TenantStatusBadge,
  Th,
  buttonClasses,
} from "@/components/ui";
import { ApiClientError } from "@/services/api-client";
import * as tenantsService from "@/services/tenants";
import { listTenantPackages } from "@/services/website";
import { cn } from "@/lib/utils";
import type { Paginated, TenantDetails, TenantPackageSummary } from "@/types/tenant";
import type { PublicWebsiteData } from "@/types/website";

const TABS = ["Overview", "Website", "Branding", "Admin", "Packages", "Settings"] as const;
type Tab = (typeof TABS)[number];

export function TenantDetail({
  initialDetails,
  initialWebsite,
  platformDomain,
  initialTab,
}: {
  initialDetails: TenantDetails;
  initialWebsite: PublicWebsiteData;
  platformDomain: string;
  /** Deep link (e.g. ?tab=packages) so "Open dashboard" lands on the right view. */
  initialTab?: string;
}) {
  /** URL tabs are lowercase ("packages"); TABS are capitalized. */
  const [tab, setTab] = useState<Tab>(() => {
    const requested = TABS.find(
      (name) => name.toLowerCase() === initialTab?.toLowerCase(),
    );
    return requested ?? "Overview";
  });
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
      setError(cause instanceof ApiClientError ? cause.message : "Could not load packages.");
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
        setError(cause instanceof ApiClientError ? cause.message : "Action failed.");
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
      setError(cause instanceof ApiClientError ? cause.message : "Could not save.");
    } finally {
      setSavingIdentity(false);
    }
  }

  const lifecycle =
    details.tenant.status === "ACTIVE" ? (
      <>
        <ConfirmButton
          confirmLabel="Confirm suspend — public site goes dark"
          onConfirm={run(() => tenantsService.suspendTenant(tenantId), "Tenant suspended.")}
        >
          Suspend
        </ConfirmButton>
        <ConfirmButton
          confirmLabel="Confirm archive — data retained"
          tone="danger"
          onConfirm={run(() => tenantsService.archiveTenant(tenantId), "Tenant archived.")}
        >
          Archive
        </ConfirmButton>
      </>
    ) : (
      <>
        <ConfirmButton
          confirmLabel="Confirm restore"
          onConfirm={run(() => tenantsService.restoreTenant(tenantId), "Tenant restored to active.")}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Restore
        </ConfirmButton>
        {details.tenant.status === "SUSPENDED" ? (
          <ConfirmButton
            confirmLabel="Confirm archive"
            tone="danger"
            onConfirm={run(() => tenantsService.archiveTenant(tenantId), "Tenant archived.")}
          >
            Archive
          </ConfirmButton>
        ) : null}
      </>
    );

  const derived = [
    { label: "Public website", on: details.tenant.status === "ACTIVE" },
    { label: "Public tracking", on: details.tenant.status === "ACTIVE" },
    { label: "Tenant admin login", on: details.tenant.status === "ACTIVE" },
  ];

  return (
    <div className="space-y-5">
      <Link
        href="/admin/tenants"
        className="inline-flex items-center gap-2 text-[13px] font-medium text-body transition-colors hover:text-slate"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All tenants
      </Link>

      <Card className="px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-slate">
              {details.tenant.companyName}
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-3">
              <Mono className="text-body">{siteUrl}</Mono>
              <TenantStatusBadge status={details.tenant.status} />
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("Packages")}
              className={buttonClasses("secondary", "sm")}
            >
              Open dashboard
            </button>
            <Link
              href={`/admin/tenants/${tenantId}/preview`}
              className={buttonClasses("secondary", "sm")}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Preview website
            </Link>
            {lifecycle}
          </div>
        </div>
      </Card>

      {message ? <SuccessNote>{message}</SuccessNote> : null}
      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {/* Tabs */}
      <div role="tablist" aria-label="Tenant sections" className="flex flex-wrap gap-1 border-b border-hair">
        {TABS.map((name) => (
          <button
            key={name}
            role="tab"
            id={`tab-${name}`}
            aria-selected={tab === name}
            aria-controls={`panel-${name}`}
            onClick={() => setTab(name)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-[13.5px] font-medium transition-colors",
              tab === name
                ? "border-accent text-accent"
                : "border-transparent text-body hover:text-slate",
            )}
          >
            {name}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "Overview" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="Company information">
              <div className="space-y-4">
                <Field label="Company name" htmlFor="tenant-company">
                  <Input
                    id="tenant-company"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Phone" htmlFor="tenant-phone">
                    <Input id="tenant-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </Field>
                  <Field label="Email" htmlFor="tenant-email">
                    <Input
                      id="tenant-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Address" htmlFor="tenant-address">
                  <Input
                    id="tenant-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </Field>
                <Button variant="primary" onClick={saveIdentity} loading={savingIdentity}>
                  Save company info
                </Button>
              </div>
            </SectionCard>

            <SectionCard title="At a glance">
              <dl className="space-y-2.5 text-[13.5px]">
                {[
                  ["Subdomain", siteUrl],
                  ["Tenant admin", details.admin ? `${details.admin.name} · ${details.admin.email}` : "—"],
                  ["Packages", String(details.packageCount)],
                  ["Website", details.websiteConfigured ? "Configured" : "Using defaults"],
                  ["Created", new Date(details.tenant.createdAt).toLocaleString()],
                  ["Updated", new Date(details.tenant.updatedAt).toLocaleString()],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-6 border-b border-hair pb-2.5 last:border-b-0">
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-right font-medium break-words text-slate">{value}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
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
          <SectionCard
            title="Tenant admin account"
            description="Exactly one admin per tenant. Passwords are Argon2id hashes — never retrievable."
          >
            {details.admin ? (
              <div className="space-y-5">
                <dl className="space-y-2.5 text-[13.5px]">
                  {[
                    ["Name", details.admin.name],
                    ["Email", details.admin.email],
                    ["Status", details.admin.status],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-6 border-b border-hair pb-2.5">
                      <dt className="text-muted">{label}</dt>
                      <dd className="font-medium text-slate">{value}</dd>
                    </div>
                  ))}
                </dl>
                <ConfirmButton
                  confirmLabel="Confirm reset — signs the admin out everywhere"
                  tone="danger"
                  size="md"
                  onConfirm={async () => {
                    const result = await tenantsService.resetTenantAdminPassword(tenantId);
                    setReset({
                      email: result.admin.email,
                      temporaryPassword: result.temporaryPassword,
                    });
                  }}
                >
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  Reset password
                </ConfirmButton>
                {reset ? (
                  <CredentialsDisplay
                    title="Password reset — one-time credentials"
                    rows={[{ label: "Admin email", value: reset.email }]}
                    temporaryPassword={reset.temporaryPassword}
                  />
                ) : null}
              </div>
            ) : (
              <p className="text-[13px] text-muted">No tenant admin on record.</p>
            )}
          </SectionCard>
        ) : null}

        {tab === "Packages" ? (
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hair px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-[15px] font-semibold text-slate">Packages</h2>
                <p className="mt-0.5 text-[13px] text-muted">
                  Server-authorized read-only view. You remain a platform admin — package
                  operations belong to the tenant&apos;s own console.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadPackages()}
                className={buttonClasses("secondary", "sm")}
              >
                Refresh
              </button>
            </div>
            {loadingPackages ? (
              <LoadingState label="Loading packages…" />
            ) : packages && packages.items.length > 0 ? (
              <TableShell>
                <thead>
                  <tr>
                    <Th>Tracking ID</Th>
                    <Th className="hidden sm:table-cell">Package</Th>
                    <Th>Status</Th>
                    <Th className="hidden md:table-cell">Receiver</Th>
                    <Th className="hidden lg:table-cell">Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {packages.items.map((pkg) => (
                    <tr key={pkg.id} className="transition-colors hover:bg-surface-2">
                      <Td>
                        <Mono className="text-accent">{pkg.trackingId}</Mono>
                      </Td>
                      <Td className="hidden text-slate sm:table-cell">{pkg.packageName}</Td>
                      <Td className="text-body">{pkg.status.replaceAll("_", " ").toLowerCase()}</Td>
                      <Td className="hidden text-body md:table-cell">{pkg.receiverName}</Td>
                      <Td className="hidden text-muted lg:table-cell">
                        {new Date(pkg.createdAt).toLocaleDateString()}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            ) : (
              <p className="px-5 py-8 text-center text-[13px] text-muted sm:px-6">
                No packages yet for this tenant.
              </p>
            )}
          </Card>
        ) : null}

        {tab === "Settings" ? (
          <SectionCard
            title="Lifecycle"
            description="Everything below is derived from the tenant's status. Data is always retained — there is no hard delete."
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-muted">Current status</span>
                <TenantStatusBadge status={details.tenant.status} />
              </div>
              <ul className="space-y-2">
                {derived.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between rounded-lg border border-hair px-3.5 py-2.5 text-[13.5px]"
                  >
                    <span className="text-slate">{item.label}</span>
                    <span className={item.on ? "font-medium text-ok" : "font-medium text-warn"}>
                      {item.on ? "Enabled" : "Disabled"}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 border-t border-hair pt-4">{lifecycle}</div>
            </div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
