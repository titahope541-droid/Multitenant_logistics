"use client";

/**
 * ShareActions — the ONE canonical share control set:
 *   Copy Tracking ID · Copy Tracking Link · Share on WhatsApp
 *
 * The URL comes from src/lib/tracking-link (window-aware local-dev
 * mapping). Clipboard is resilient (fallback → manual-copy hint). The
 * WhatsApp path is a plain wa.me share link — never the WhatsApp API.
 * Wraps/stacks responsively; every control is a real button/anchor.
 */

import { useState } from "react";
import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { buildTrackingUrlFromWindow, buildWhatsAppShareUrl } from "@/lib/tracking-link";
import { useCopyToClipboard } from "@/lib/use-copy";
import { cn } from "@/lib/utils";

export function ShareActions({
  trackingId,
  companyName,
  slug,
  layout = "row",
  className,
}: {
  trackingId: string;
  companyName: string;
  slug: string;
  layout?: "row" | "card";
  className?: string;
}) {
  const idCopy = useCopyToClipboard();
  const linkCopy = useCopyToClipboard();
  const [waNote, setWaNote] = useState(false);

  const trackingUrl =
    typeof window !== "undefined"
      ? buildTrackingUrlFromWindow({ slug, trackingId })
      : null;
  const whatsappUrl = trackingUrl
    ? buildWhatsAppShareUrl({ companyName, trackingId, trackingUrl })
    : null;

  const buttonClass = cn(
    "inline-flex items-center gap-2 border px-3.5 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors",
    layout === "card"
      ? "border-line text-fog hover:border-paper/40 hover:text-paper"
      : "border-line text-fog hover:border-paper/40 hover:text-paper",
  );

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => void idCopy.copy(trackingId)}
          className={buttonClass}
          aria-live="polite"
        >
          {idCopy.state === "copied" ? (
            <Check className="h-3.5 w-3.5 text-mint" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {idCopy.state === "copied" ? "Copied!" : "Copy Tracking ID"}
        </button>

        <button
          type="button"
          onClick={() => trackingUrl && void linkCopy.copy(trackingUrl)}
          disabled={!trackingUrl}
          className={buttonClass}
          aria-live="polite"
        >
          {linkCopy.state === "copied" ? (
            <Check className="h-3.5 w-3.5 text-mint" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {linkCopy.state === "copied" ? "Copied!" : "Copy Tracking Link"}
        </button>

        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              setWaNote(true);
              window.setTimeout(() => setWaNote(false), 1800);
            }}
            className={cn(
              buttonClass,
              "border-emerald-500/40 text-emerald-500 hover:border-emerald-500/70 hover:text-emerald-400",
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {waNote ? "Opening WhatsApp…" : "Share on WhatsApp"}
          </a>
        ) : null}

        {trackingUrl ? (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open tracking page
          </a>
        ) : null}
      </div>

      {(idCopy.state === "failed" || linkCopy.state === "failed") && trackingUrl ? (
        <p role="status" className="mt-2 border border-line bg-panel px-3 py-2 font-mono text-[10.5px] leading-4 break-all text-fog">
          Clipboard is unavailable in this browser — copy manually:
          <br />
          <span className="text-paper select-all">{trackingUrl}</span>
        </p>
      ) : null}
    </div>
  );
}

/** Compact icon-button copy-link for package list rows. */
export function CopyLinkIconButton({
  trackingId,
  slug,
}: {
  trackingId: string;
  slug: string;
}) {
  const { state, copy } = useCopyToClipboard();
  return (
    <button
      type="button"
      title={state === "copied" ? "Tracking link copied!" : "Copy tracking link"}
      aria-label={`Copy tracking link for ${trackingId}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void copy(buildTrackingUrlFromWindow({ slug, trackingId }));
      }}
      className="inline-flex items-center gap-1.5 border border-line px-2 py-1 font-mono text-[9px] tracking-[0.12em] text-fog uppercase transition-colors hover:border-paper/40 hover:text-paper"
    >
      {state === "copied" ? (
        <Check className="h-3 w-3 text-mint" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {state === "copied" ? "Copied" : "Link"}
    </button>
  );
}
