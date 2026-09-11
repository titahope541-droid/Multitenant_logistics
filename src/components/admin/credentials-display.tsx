"use client";

/**
 * One-time credential disclosure — shown immediately after tenant creation
 * or a password reset. The temporary password exists only in this card;
 * it is never stored, logged, or retrievable again.
 */

import { useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";

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
    await navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section
      aria-live="polite"
      className="border border-signal/40 bg-panel p-5 sm:p-6"
    >
      <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-signal uppercase">
        <TriangleAlert className="h-3.5 w-3.5" />
        {title}
      </p>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 font-mono text-[12px]">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-dim">{row.label}</dt>
            <dd className="truncate text-paper">{row.value}</dd>
          </div>
        ))}
        <div className="contents">
          <dt className="text-dim">temporary password</dt>
          <dd className="flex items-center gap-3">
            <span className="tracking-[0.15em] text-paper">{temporaryPassword}</span>
            <button
              onClick={copy}
              className="inline-flex items-center gap-1 border border-line px-2 py-0.5 font-mono text-[9px] tracking-[0.15em] text-fog uppercase transition-colors hover:border-paper/40 hover:text-paper"
            >
              {copied ? <Check className="h-3 w-3 text-mint" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </dd>
        </div>
      </dl>
      <p className="mt-4 border-t border-line pt-3 font-mono text-[10px] leading-4 tracking-[0.05em] text-dim">
        Shown once — now closed means gone. Share through a secure channel;
        the admin should change it after first sign-in.
      </p>
    </section>
  );
}
