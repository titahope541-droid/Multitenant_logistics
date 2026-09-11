"use client";

/**
 * useCopyToClipboard — resilient clipboard hook.
 *
 * 1. navigator.clipboard.writeText (secure context)
 * 2. execCommand("copy") fallback via a hidden textarea
 * 3. reports `failed` so the UI can show the value inline for manual copy
 *
 * Never throws at the caller; every outcome is an accessible state
 * (idle → copied → failed) that auto-resets.
 */

import { useCallback, useRef, useState } from "react";

export type CopyState = "idle" | "copied" | "failed";

export function useCopyToClipboard(resetMs = 1600): {
  state: CopyState;
  copy: (text: string) => Promise<void>;
} {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string) => {
      if (timer.current) clearTimeout(timer.current);
      let ok = false;
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          ok = true;
        }
      } catch {
        ok = false;
      }
      if (!ok && typeof document !== "undefined") {
        try {
          const area = document.createElement("textarea");
          area.value = text;
          area.setAttribute("readonly", "");
          area.style.position = "fixed";
          area.style.opacity = "0";
          document.body.appendChild(area);
          area.select();
          ok = document.execCommand("copy");
          document.body.removeChild(area);
        } catch {
          ok = false;
        }
      }
      setState(ok ? "copied" : "failed");
      timer.current = setTimeout(() => setState("idle"), resetMs);
    },
    [resetMs],
  );

  return { state, copy };
}
