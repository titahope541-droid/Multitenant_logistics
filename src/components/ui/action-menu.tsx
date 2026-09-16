"use client";

/**
 * ActionMenu — a compact three-dot dropdown for row-level actions.
 * Keyboard accessible: the trigger opens with Enter/Space, items are real
 * buttons/links with `role="menuitem"`, Escape closes, and outside clicks
 * dismiss it. Focus returns to the trigger on close.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionMenuItem {
  label: string;
  /** Navigate instead of act. */
  href?: string;
  onSelect?: () => void;
  danger?: boolean;
}

export function ActionMenu({
  items,
  ariaLabel,
  align = "right",
}: {
  items: ActionMenuItem[];
  ariaLabel: string;
  align?: "right" | "left";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-slate"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={ariaLabel}
          className={cn(
            "absolute z-50 mt-1.5 w-52 rounded-xl border border-hair bg-surface p-1.5 shadow-[var(--shadow-raised)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                role="menuitem"
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-[13.5px] font-medium text-body transition-colors hover:bg-surface-2 hover:text-slate"
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
                className={cn(
                  "block w-full rounded-lg px-3 py-2 text-left text-[13.5px] font-medium transition-colors",
                  item.danger
                    ? "text-danger hover:bg-danger-soft"
                    : "text-body hover:bg-surface-2 hover:text-slate",
                )}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
