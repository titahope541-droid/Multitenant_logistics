"use client";

/**
 * Tracking CTA — the customer's primary action.
 *
 * The inline field does NOT implement tracking: it forwards to the existing
 * `/track?trackingId=…` route, which owns validation and lookup. Nothing is
 * duplicated; if the ID is malformed the customer simply lands on the
 * tracking page's own validation state.
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { TRACKING_ID_PARAM_PATTERN } from "@/lib/validation-patterns";
import type { PublicWebsiteData } from "@/types/website";

export function SiteTrackingCta({ data }: { data: PublicWebsiteData }) {
  const router = useRouter();
  const { tracking } = data.sections;
  const [value, setValue] = useState("");

  if (!tracking.enabled) return null;

  const trimmed = value.trim();
  const valid = TRACKING_ID_PARAM_PATTERN.test(trimmed);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    router.push(`/track?trackingId=${encodeURIComponent(trimmed)}`);
  }

  return (
    <section id="track" className="border-b border-black/8 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div
          className="overflow-hidden rounded-3xl px-6 py-12 sm:px-10 sm:py-14"
          style={{ backgroundColor: "var(--brand-ink)" }}
        >
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            {/* Copy */}
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.025em] text-white sm:text-4xl">
                {tracking.heading}
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-8 text-white/75">
                {tracking.subtext}
              </p>
            </div>

            {/* Inline tracking field → existing /track page */}
            <div className="rounded-2xl bg-white p-5 shadow-xl sm:p-6">
              <form onSubmit={onSubmit} className="space-y-3">
                <label
                  htmlFor="hero-tracking-id"
                  className="block text-[13px] font-medium text-neutral-700"
                >
                  Your tracking ID
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="hero-tracking-id"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder="PKG-XXX-00000000-XXXXXX"
                    autoComplete="off"
                    spellCheck={false}
                    aria-describedby="hero-tracking-help"
                    className="min-w-0 flex-1 rounded-xl border border-black/12 bg-white px-4 py-3 font-mono text-[14px] text-neutral-900 outline-none transition-colors placeholder:font-sans placeholder:text-neutral-400 focus:border-[color:var(--brand)]"
                  />
                  <button
                    type="submit"
                    disabled={!valid}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ backgroundColor: "var(--brand)" }}
                  >
                    {tracking.ctaLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p id="hero-tracking-help" className="text-[12.5px] text-neutral-500">
                  No account needed — your tracking ID came from the company that shipped your
                  package.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
