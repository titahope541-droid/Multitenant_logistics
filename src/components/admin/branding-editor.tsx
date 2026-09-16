"use client";

/**
 * Branding tab — colors, typography, button style, radius, theme, logo
 * and favicon URLs. Values are validated (hex / enum / bounded number)
 * server-side; branding can never inject CSS or markup.
 */

import { useState } from "react";
import { ApiClientError } from "@/services/api-client";
import { saveBranding } from "@/services/website";
import { ColorField, Field, Panel, SaveBar, TextField, fieldClass } from "@/components/admin/ui";
import { BUTTON_STYLES, FONT_CHOICES, THEME_PREFERENCES } from "@/lib/website-defaults";
import type { WebsiteBranding } from "@/types/website";

export function BrandingEditor({
  tenantId,
  companyName,
  initial,
}: {
  tenantId: string;
  companyName: string;
  initial: WebsiteBranding;
}) {
  const [branding, setBranding] = useState<WebsiteBranding>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof WebsiteBranding>(key: K, value: WebsiteBranding[K]) {
    setBranding((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const result = await saveBranding(tenantId, branding);
      setBranding(result.branding);
      setMessage("Branding saved.");
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Panel title="Identity">
        <p className="mb-4 text-[12.5px] leading-5 text-muted">
          Company name comes from tenant identity ({companyName}) — change
          it on the Overview tab. Images are URLs; there is no upload
          system. A publicly reachable URL is not automatically licensed
          for commercial reuse — use assets the tenant may legally use.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Logo URL" value={branding.logoUrl ?? ""} placeholder="https://…" onChange={(v) => set("logoUrl", v)} />
          <TextField label="Favicon URL" value={branding.faviconUrl ?? ""} placeholder="https://…" onChange={(v) => set("faviconUrl", v)} />
          <TextField label="Tagline" value={branding.tagline ?? ""} maxLength={160} onChange={(v) => set("tagline", v)} />
        </div>
      </Panel>

      <Panel title="Palette">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ColorField label="Primary" value={branding.primaryColor} onChange={(v) => set("primaryColor", v)} />
          <ColorField label="Secondary" value={branding.secondaryColor} onChange={(v) => set("secondaryColor", v)} />
          <ColorField label="Accent" value={branding.accentColor} onChange={(v) => set("accentColor", v)} />
          <ColorField label="Background" value={branding.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
          <ColorField label="Text" value={branding.textColor} onChange={(v) => set("textColor", v)} />
        </div>
      </Panel>

      <Panel title="Typography & shape">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Typeface">
            <select value={branding.fontFamily} onChange={(e) => set("fontFamily", e.target.value)} className={fieldClass}>
              {FONT_CHOICES.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </Field>
          <Field label="Button style">
            <select value={branding.buttonStyle} onChange={(e) => set("buttonStyle", e.target.value as WebsiteBranding["buttonStyle"])} className={fieldClass}>
              {BUTTON_STYLES.map((style) => (
                <option key={style} value={style}>{style}</option>
              ))}
            </select>
          </Field>
          <Field label="Border radius (px)">
            <input
              type="number"
              min={0}
              max={32}
              value={branding.borderRadius}
              onChange={(e) => set("borderRadius", Number(e.target.value))}
              className={fieldClass}
            />
          </Field>
          <Field label="Theme preference">
            <select value={branding.theme} onChange={(e) => set("theme", e.target.value as WebsiteBranding["theme"])} className={fieldClass}>
              {THEME_PREFERENCES.map((theme) => (
                <option key={theme} value={theme}>{theme}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4 border border-hair p-4" style={{ backgroundColor: branding.backgroundColor }}>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: branding.textColor, opacity: 0.6 }}>
            Live preview
          </span>
          <span
            className="px-4 py-2 text-[12px] font-semibold text-white"
            style={{
              backgroundColor: branding.primaryColor,
              borderRadius: branding.buttonStyle === "pill" ? 9999 : branding.buttonStyle === "rounded" ? Math.max(6, branding.borderRadius || 8) : branding.borderRadius,
            }}
          >
            Track package
          </span>
          <span className="text-[13px]" style={{ color: branding.textColor }}>
            Body text on the tenant background
          </span>
        </div>
      </Panel>

      <SaveBar busy={busy} message={message} error={error} onSave={save} label="Save branding" />
    </div>
  );
}
