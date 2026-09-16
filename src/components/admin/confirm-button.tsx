"use client";

/**
 * Two-step confirm button — dangerous actions (suspend, archive, reset)
 * require an explicit second click that states the consequence. Reverts
 * to idle after a few seconds or when the pointer leaves.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/utils";

export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  tone = "neutral",
  disabled,
  size = "sm",
}: {
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  tone?: "neutral" | "danger";
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const [state, setState] = useState<"idle" | "confirm" | "busy">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

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
      type="button"
      onClick={onClick}
      onMouseLeave={() => state === "confirm" && setState("idle")}
      disabled={disabled || state === "busy"}
      className={cn(
        buttonClasses(state === "confirm" || tone === "danger" ? "danger" : "secondary", size),
        state === "confirm" && "ring-2 ring-danger/20",
      )}
    >
      {state === "busy" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
      {state === "confirm" ? confirmLabel : children}
    </button>
  );
}
