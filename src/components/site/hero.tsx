import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { HeroCanvas } from "@/components/site/hero-canvas";
import { PLATFORM } from "@/lib/constants";

const STATS = [
  { value: "11 / 12", label: "Hardened & verified" },
  { value: "05", label: "Package statuses — locked" },
  { value: "156", label: "Tests — all green" },
  { value: "00", label: "Customer accounts — by design" },
] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-14">
      {/* backdrop */}
      <div className="dotgrid absolute inset-0 opacity-[0.35]" aria-hidden="true" />
      <HeroCanvas />

      <div className="relative mx-auto max-w-7xl px-5 pt-20 pb-14 sm:px-8 sm:pt-28 sm:pb-20">
        {/* eyebrow row */}
        <div className="mb-10 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-[10px] tracking-[0.3em] text-dim uppercase">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse-soft bg-signal" />
            Multi-tenant logistics tracking
          </span>
          <span className="hidden sm:inline">LAT 06°27′ N — LNG 03°23′ E</span>
          <span>Manifest {PLATFORM.name.toUpperCase()}-P1</span>
        </div>

        {/* headline */}
        <h1 className="max-w-5xl text-[clamp(2.9rem,8.2vw,7rem)] leading-[0.94] font-bold tracking-[-0.035em] text-paper">
          One platform.
          <br />
          Every fleet.
          <br />
          <span className="text-dim">Strict boundaries.</span>
        </h1>

        {/* deck */}
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,34rem)_1fr] lg:items-end">
          <p className="text-[15px] leading-7 text-fog sm:text-base">
            {PLATFORM.name} operates many independent logistics companies from a
            single application and a single database — each with its own branded
            website, public package tracking, and admin console, enforced by
            server-side tenant isolation. This build ships{" "}
            <span className="text-paper">Phase 11 — reliability, tested</span>:
            a three-layer suite with a production-refusal guard, an IDOR
            matrix proving tenant isolation, HTTP hardening, and a
            release gate: 156 tests, all green, zero exceptions.
          </p>

          <div className="flex flex-wrap items-center gap-4 lg:justify-end">
            <Link
              href="/docs/architecture"
              className="group inline-flex items-center gap-2 border border-paper/25 bg-paper px-5 py-3 font-mono text-[11px] font-medium tracking-[0.2em] text-ink uppercase transition-colors hover:bg-signal hover:border-signal"
            >
              Read the architecture
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <a
              href="#roadmap"
              className="group inline-flex items-center gap-2 border border-line px-5 py-3 font-mono text-[11px] tracking-[0.2em] text-fog uppercase transition-colors hover:border-paper/40 hover:text-paper"
            >
              Phase roadmap
              <ArrowDownRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* stat rail */}
        <dl className="mt-16 grid grid-cols-2 border-t border-line sm:mt-20 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="border-r border-line px-4 py-5 first:pl-0 last:border-r-0 sm:px-6"
            >
              <dt className="order-2 mt-2 font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                {stat.label}
              </dt>
              <dd className="-order-1 text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
