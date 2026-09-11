"use client";

/**
 * Remote website image with a graceful failure path.
 *
 * Images are URL-based by locked decision (no uploads, no asset store).
 * Remote hosts are arbitrary and unverifiable, so we render a plain <img>
 * (no Next remote-host allowlist to maintain) and, when a URL fails,
 * remove it rather than leaving broken-image clutter — layout survives.
 */

import { useState } from "react";

export function SiteImage({
  src,
  alt,
  className,
  decorative = false,
}: {
  src: string;
  alt: string;
  className?: string;
  decorative?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return decorative ? null : (
      <div
        className={`${className ?? ""} flex items-center justify-center bg-neutral-100 text-[11px] text-neutral-400`}
        role="img"
        aria-label={alt}
      >
        Image unavailable
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={decorative ? "" : alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
      {...(decorative ? { "aria-hidden": true } : {})}
    />
  );
}
