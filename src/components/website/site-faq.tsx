"use client";

/**
 * FAQ — accessible accordion. Questions/answers come from WebsiteConfig
 * (defaults are accurate platform copy); the platform admin can edit,
 * hide, or disable them per tenant.
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicWebsiteData } from "@/types/website";

export function SiteFaq({ data }: { data: PublicWebsiteData }) {
  const { faq } = data.sections;
  const items = faq.items.filter((item) => item.visible);
  const [open, setOpen] = useState<number | null>(0);

  if (!faq.enabled || items.length === 0) return null;

  return (
    <section id="faq" className="border-b border-black/8 bg-white">
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        <p
          className="text-[12px] font-semibold tracking-[0.18em] uppercase"
          style={{ color: "var(--brand)" }}
        >
          Questions
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-neutral-900 sm:text-4xl">
          {faq.title}
        </h2>

        <div className="mt-9 space-y-3">
          {items.map((item, index) => {
            const isOpen = open === index;
            return (
              <div
                key={`${item.question}-${index}`}
                className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm"
              >
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                    onClick={() => setOpen(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-neutral-50"
                  >
                    <span className="text-[15px] font-medium text-neutral-900">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-neutral-400 transition-transform",
                        isOpen && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                {isOpen ? (
                  <div
                    id={`faq-panel-${index}`}
                    role="region"
                    className="px-5 pb-5 text-[14px] leading-7 text-neutral-600"
                  >
                    {item.answer}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
