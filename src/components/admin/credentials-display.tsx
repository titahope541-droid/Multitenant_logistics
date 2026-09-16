"use client";

/**
 * One-time credential disclosure — shown immediately after tenant
 * creation or a password reset. The temporary password exists only in
 * this card; it is never stored, logged, or retrievable again.
 */

import { useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Mono, buttonClasses } from "@/components/ui";

export function CredentialsDisplay({
  title,
  rows,
  temporaryPassword,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
  temporaryPassword: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      aria-live="polite"
      className="rounded-xl border border-accent/25 bg-accent-soft p-5 sm:p-6"
    >
      <p className="flex items-center gap-2 text-[13px] font-semibold text-accent">
        <TriangleAlert className="h-4 w-4" aria-hidden="true" />
        {title}
      </p>

      <dl className="mt-4 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap items-baseline gap-x-3">
            <dt className="w-32 shrink-0 text-[12.5px] text-muted">{row.label}</dt>
            <dd className="text-[13.5px] font-medium text-slate">{row.value}</dd>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <dt className="w-32 shrink-0 text-[12.5px] text-muted">Temporary password</dt>
          <dd className="flex items-center gap-3">
            <Mono className="rounded-md bg-surface px-2.5 py-1 text-[13.5px] font-medium text-slate select-all">
              {temporaryPassword}
            </Mono>
            <button type="button" onClick={copy} className={buttonClasses("secondary", "sm")}>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-ok" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </dd>
        </div>
      </dl>

      <p className="mt-4 border-t border-accent/20 pt-3 text-[12px] leading-5 text-body">
        Shown once — closing this means it is gone. Share it through a secure channel; the admin
        should change it after first sign-in.
      </p>
    </section>
  );
}
