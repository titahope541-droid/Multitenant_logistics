import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PackageSearch, ShieldCheck } from "lucide-react";
import { LoginPanel } from "@/components/auth/login-panel";
import { Card } from "@/components/ui";
import { PLATFORM } from "@/lib/constants";
import { getPageAuthContext } from "@/server/middleware/page-auth";
import { resolveRequestSite } from "@/server/services/tenant-resolution.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the administration area.",
  robots: { index: false, follow: false },
};

/**
 * Sign-in. The page adapts its wording to the host it is served from
 * (tenant administration vs platform administration) and sends an
 * already-authenticated visitor straight to their console.
 */
export default async function LoginPage() {
  const auth = await getPageAuthContext();
  if (auth) redirect(auth.user.role === "PLATFORM_ADMIN" ? "/admin" : "/dashboard");

  const site = await resolveRequestSite();
  const isTenantHost = site.kind === "tenant";
  const companyName = isTenantHost ? site.tenant.companyName : PLATFORM.name;
  const areaLabel = isTenantHost ? "Tenant administration" : "Platform administration";
  const areaBlurb = isTenantHost
    ? "Manage packages, statuses, and delivery locations for your company."
    : "Manage tenants, their websites, and platform-wide settings.";

  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-20 lg:py-20">
        {/* Context column */}
        <section className="hidden lg:block">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-[12px] font-medium text-accent">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {areaLabel}
          </span>
          <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-[-0.03em] text-slate">
            {companyName}
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-body">{areaBlurb}</p>
          <ul className="mt-8 space-y-3 text-[14px] text-body">
            {[
              "Create shipments and share tracking IDs with customers",
              "Update status and location — customers see it live",
              "Every action is scoped to your company only",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </section>

        {/* Form column */}
        <Card className="p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-[12px] font-medium tracking-wide text-accent uppercase lg:hidden">
              {areaLabel}
            </p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-slate">
              Sign in
            </h2>
            <p className="mt-1.5 text-[13.5px] text-muted">
              Use the credentials issued for {companyName}.
            </p>
          </div>

          <LoginPanel />

          <p className="mt-6 border-t border-hair pt-5 text-[12.5px] leading-5 text-muted">
            Tracking a package? You don&apos;t need an account —{" "}
            <Link
              href="/track"
              className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
            >
              <PackageSearch className="h-3.5 w-3.5" aria-hidden="true" />
              track it here
            </Link>
            .
          </p>
        </Card>
      </div>
    </main>
  );
}
