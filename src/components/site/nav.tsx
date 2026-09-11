import Link from "next/link";
import { PLATFORM } from "@/lib/constants";

const LINKS = [
  { href: "#architecture", label: "Architecture" },
  { href: "#tenancy", label: "Tenancy" },
  { href: "#charter", label: "Charter" },
  { href: "#roadmap", label: "Roadmap" },
  { href: "/docs", label: "Docs" },
] as const;

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="text-[15px] font-bold tracking-[0.22em] text-paper">
            {PLATFORM.codename}
          </span>
          <span className="font-mono text-[10px] tracking-[0.3em] text-dim group-hover:text-signal">
            PLATFORM
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-mono text-[11px] tracking-[0.18em] text-fog uppercase transition-colors hover:text-paper"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="font-mono text-[11px] tracking-[0.18em] text-fog uppercase transition-colors hover:text-paper"
          >
            Sign in
          </Link>
          <span className="hidden font-mono text-[10px] tracking-[0.25em] text-dim sm:inline">
            BUILD 0.1.0
          </span>
          <span className="border border-line px-2.5 py-1 font-mono text-[10px] tracking-[0.25em] text-signal">
            PHASE 11
          </span>
        </div>
      </div>
    </header>
  );
}
