import type { Metadata } from "next";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { requirePageRole } from "@/server/middleware/page-auth";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const auth = await requirePageRole("PLATFORM_ADMIN");
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-signal uppercase">
        Control plane — settings
      </p>
      <h1 className="text-3xl font-bold tracking-[-0.02em] text-paper">Platform settings.</h1>

      <div className="mt-8 max-w-2xl space-y-5">
        <section className="border border-line bg-panel p-5 sm:p-6">
          <p className="mb-4 font-mono text-[10px] tracking-[0.25em] text-signal uppercase">
            Platform account
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono text-[12px]">
            <dt className="text-dim">name</dt>
            <dd className="text-paper">{auth.user.name}</dd>
            <dt className="text-dim">email</dt>
            <dd className="text-paper">{auth.user.email}</dd>
            <dt className="text-dim">role</dt>
            <dd className="text-signal">{auth.user.role}</dd>
          </dl>
        </section>

        <section className="flex items-start gap-4 border border-line bg-panel p-5 sm:p-6">
          <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-dim" strokeWidth={1.5} />
          <p className="text-sm leading-6 text-fog">
            Per-tenant website, branding, lifecycle, and admin controls live on
            each tenant&apos;s page under{" "}
            <Link href="/admin/tenants" className="text-signal hover:text-signal-hot">
              Tenants
            </Link>
            . Platform-wide preferences beyond this account view are
            intentionally out of V1 scope — no billing, subscriptions, or
            staff management exists.
          </p>
        </section>
      </div>
    </div>
  );
}
