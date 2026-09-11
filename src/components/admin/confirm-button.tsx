"use client";

/**
 * Two-step confirm button — dangerous actions (suspend, archive, reset)
 * require an explicit confirmation click before executing. Reverts to
 * idle after 4 seconds or when the pointer leaves.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  tone = "neutral",
  disabled,
}: {
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  tone?: "neutral" | "danger";
  disabled?: boolean;
}) {
  const [state, setState] = useState<"idle" | "confirm" | "busy">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function onClick() {
    if (disabled) return;
    if (state === "idle") {
      setState("confirm");
      timer.current = setTimeout(() => setState("idle"), 4000);
      return;
    }
    if (state === "confirm") {
      if (timer.current) clearTimeout(timer.current);
      setState("busy");
      try {
        await onConfirm();
      } finally {
        setState("idle");
      }
    }
  }

  return (
    <button
      onClick={onClick}
      onMouseLeave={() => state === "confirm" && setState("idle")}
      disabled={disabled || state === "busy"}
      className={cn(
        "inline-flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[9.5px] tracking-[0.15em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        state === "confirm"
          ? "border-crimson/70 text-crimson"
          : tone === "danger"
            ? "border-line text-fog hover:border-crimson/60 hover:text-crimson"
            : "border-line text-fog hover:border-paper/40 hover:text-paper",
      )}
    >
      {state === "busy" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {state === "confirm" ? confirmLabel : children}
    </button>
  );
}
