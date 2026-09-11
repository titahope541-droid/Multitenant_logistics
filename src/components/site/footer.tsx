import Link from "next/link";
import { PLATFORM } from "@/lib/constants";
import { DOC_ENTRIES } from "@/lib/docs";

export function Footer() {
  return (
    <footer className="bg-ink">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p className="text-3xl font-bold tracking-[0.2em] text-paper sm:text-4xl">
              {PLATFORM.codename}
            </p>
            <p className="mt-3 font-mono text-[10px] tracking-[0.3em] text-dim uppercase">
              {PLATFORM.tagline}
            </p>
            <p className="mt-6 max-w-sm text-sm leading-6 text-fog">
              Multi-tenant logistics tracking: one shared application, one
              shared database, strict server-side tenant isolation — branded
              sites and public tracking for every fleet on the platform.
            </p>
          </div>

          <nav aria-label="Documentation">
            <p className="mb-5 font-mono text-[10px] tracking-[0.3em] text-dim uppercase">
              Documentation
            </p>
            <ul className="space-y-2.5">
              {DOC_ENTRIES.slice(0, 5).map((doc) => (
                <li key={doc.slug}>
                  <Link
                    href={`/docs/${doc.slug}`}
                    className="text-sm text-fog transition-colors hover:text-paper"
                  >
                    {doc.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/docs" className="text-sm text-signal transition-colors hover:text-signal-hot">
                  All documents →
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Portal sections">
            <p className="mb-5 font-mono text-[10px] tracking-[0.3em] text-dim uppercase">
              Portal
            </p>
            <ul className="space-y-2.5">
              {[
                ["#architecture", "System architecture"],
                ["#tenancy", "Multi-tenant model"],
                ["#charter", "Locked decisions"],
                ["#roadmap", "Phase roadmap"],
                ["/api/health", "GET /api/health"],
              ].map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="text-sm text-fog transition-colors hover:text-paper">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-line py-6 font-mono text-[10px] tracking-[0.2em] text-dim uppercase sm:flex-row sm:items-center sm:justify-between">
          <span>
            {PLATFORM.name} · build 0.1.0 · {PLATFORM.domainPlaceholder}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-signal" />
            Phase 11 hardening complete — awaiting Phase 12 approval
          </span>
        </div>
      </div>
    </footer>
  );
}
