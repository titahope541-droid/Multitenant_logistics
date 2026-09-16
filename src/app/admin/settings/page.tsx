import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader, SectionCard } from "@/components/ui";
import { getServerConfig } from "@/server/config/env";
import { requirePageRole } from "@/server/middleware/page-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const auth = await requirePageRole("PLATFORM_ADMIN");
  const { platformDomain } = getServerConfig();

  const rows = [
    { label: "Name", value: auth.user.name },
    { label: "Email", value: auth.user.email },
    { label: "Role", value: "Platform admin" },
    { label: "Platform domain", value: platformDomain },
  ];

  return (
    <>
      <PageHeader title="Settings" description="Platform account and environment." />

      <div className="grid max-w-3xl gap-5">
        <Card>
          <div className="border-b border-hair px-5 py-4 sm:px-6">
            <h2 className="text-[15px] font-semibold text-slate">Platform account</h2>
          </div>
          <dl className="divide-y divide-hair">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
                <dt className="text-[13px] text-muted">{row.label}</dt>
                <dd className="truncate text-[13.5px] font-medium text-slate">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <SectionCard title="Where things live">
          <p className="text-[13.5px] leading-6 text-body">
            Per-tenant website content, branding, SEO, lifecycle and admin credentials are managed
            on each tenant&apos;s page under{" "}
            <Link href="/admin/tenants" className="font-medium text-accent hover:underline">
              Tenants
            </Link>
            . Platform-wide preferences beyond this account view are intentionally out of scope —
            there is no billing, subscription or staff management in V1.
          </p>
        </SectionCard>
      </div>
    </>
  );
}
