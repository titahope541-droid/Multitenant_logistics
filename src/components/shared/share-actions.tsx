"use client";

/**
 * ShareActions — the canonical customer-sharing controls:
 *   Copy Tracking ID · Copy Tracking Link · Share on WhatsApp
 *
 * URLs come from src/lib/tracking-link (window-aware for local dev).
 * Clipboard is resilient: native API → execCommand → visible manual copy.
 * WhatsApp is a plain wa.me share link, never the WhatsApp API.
 */

import { useState } from "react";
import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { buttonClasses } from "@/components/ui";
import { buildTrackingUrlFromWindow, buildWhatsAppShareUrl } from "@/lib/tracking-link";
import { useCopyToClipboard } from "@/lib/use-copy";
import { cn } from "@/lib/utils";

export function ShareActions({
  trackingId,
  companyName,
  slug,
  className,
}: {
  trackingId: string;
  companyName: string;
  slug: string;
  className?: string;
}) {
  const idCopy = useCopyToClipboard();
  const linkCopy = useCopyToClipboard();
  const [waNote, setWaNote] = useState(false);

  const trackingUrl =
    typeof window !== "undefined" ? buildTrackingUrlFromWindow({ slug, trackingId }) : null;
  const whatsappUrl = trackingUrl
    ? buildWhatsAppShareUrl({ companyName, trackingId, trackingUrl })
    : null;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => void idCopy.copy(trackingId)}
          className={buttonClasses("secondary", "sm")}
          aria-live="polite"
        >
          {idCopy.state === "copied" ? (
            <Check className="h-3.5 w-3.5 text-ok" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {idCopy.state === "copied" ? "Copied!" : "Copy tracking ID"}
        </button>

        <button
          type="button"
          onClick={() => trackingUrl && void linkCopy.copy(trackingUrl)}
          disabled={!trackingUrl}
          className={buttonClasses("secondary", "sm")}
          aria-live="polite"
        >
          {linkCopy.state === "copied" ? (
            <Check className="h-3.5 w-3.5 text-ok" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {linkCopy.state === "copied" ? "Copied!" : "Copy tracking link"}
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
              buttonClasses("secondary", "sm"),
              "border-ok/30 text-ok hover:border-ok/60 hover:bg-ok-soft",
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {waNote ? "Opening WhatsApp…" : "Share on WhatsApp"}
          </a>
        ) : null}

        {trackingUrl ? (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("ghost", "sm")}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Open tracking page
          </a>
        ) : null}
      </div>

      {(idCopy.state === "failed" || linkCopy.state === "failed") && trackingUrl ? (
        <p
          role="status"
          className="mt-3 rounded-lg border border-hair bg-surface-2 px-3.5 py-2.5 text-[12.5px] leading-5 break-all text-body"
        >
          Clipboard unavailable in this browser — copy manually:{" "}
          <span className="font-mono text-slate select-all">{trackingUrl}</span>
        </p>
      ) : null}
    </div>
  );
}

/** Compact copy-link control for table rows. */
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
      title={state === "copied" ? "Tracking link copied" : "Copy tracking link"}
      aria-label={`Copy tracking link for ${trackingId}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void copy(buildTrackingUrlFromWindow({ slug, trackingId }));
      }}
      className="rounded-md p-1 text-muted transition-colors hover:bg-surface-2 hover:text-slate"
    >
      {state === "copied" ? (
        <Check className="h-3.5 w-3.5 text-ok" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </button>
  );
}
