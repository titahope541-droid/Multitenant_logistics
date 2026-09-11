"use client";

/**
 * Website tab — structured forms for every section (no page builder).
 * Sections: visibility toggles, ordering (Move up/down), hero, services,
 * about, features, tracking CTA, contact, footer, navigation, social, SEO.
 * Saves the whole draft in one PATCH; the public site publishes instantly.
 */

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { ApiClientError } from "@/services/api-client";
import { saveWebsiteConfig } from "@/services/website";
import { Panel, SaveBar, TextArea, TextField, Toggle, fieldClass, Label } from "@/components/admin/ui";
import {
  SECTION_LABELS,
  WEBSITE_ICONS,
  WEBSITE_LIMITS,
  type WebsiteSectionKey,
} from "@/lib/website-defaults";
import type { PublicWebsiteData, WebsiteCardItem } from "@/types/website";

function CardListEditor({
  items,
  limit,
  onChange,
  noun,
}: {
  items: WebsiteCardItem[];
  limit: number;
  onChange: (items: WebsiteCardItem[]) => void;
  noun: string;
}) {
  function update(index: number, patch: Partial<WebsiteCardItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="grid gap-3 border border-line bg-ink p-3.5 sm:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <Label>Title</Label>
            <input
              value={item.title}
              maxLength={80}
              onChange={(event) => update(index, { title: event.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <Label>Description</Label>
            <input
              value={item.description ?? ""}
              maxLength={400}
              onChange={(event) => update(index, { description: event.target.value })}
              className={fieldClass}
            />
          </label>
          <div className="flex items-end gap-2">
            <label className="block">
              <Label>Icon</Label>
              <select
                value={item.icon ?? "truck"}
                onChange={(event) => update(index, { icon: event.target.value as WebsiteCardItem["icon"] })}
                className={`${fieldClass} w-32`}
              >
                {WEBSITE_ICONS.map((icon) => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => update(index, { visible: !item.visible })}
              className="mb-0.5 border border-line px-2.5 py-2 font-mono text-[9.5px] tracking-[0.15em] text-fog uppercase transition-colors hover:text-paper"
            >
              {item.visible ? "Shown" : "Hidden"}
            </button>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              aria-label={`Remove ${noun} ${index + 1}`}
              className="mb-0.5 border border-line px-2.5 py-2 text-dim transition-colors hover:border-crimson/60 hover:text-crimson"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
      {items.length < limit ? (
        <button
          type="button"
          onClick={() => onChange([...items, { title: `New ${noun}`, description: "", icon: "truck", visible: true }])}
          className="inline-flex items-center gap-2 border border-line px-3.5 py-2 font-mono text-[10px] tracking-[0.18em] text-fog uppercase transition-colors hover:border-paper/40 hover:text-paper"
        >
          <Plus className="h-3 w-3" /> Add {noun}
        </button>
      ) : (
        <p className="font-mono text-[10px] text-dim">Maximum {limit} entries.</p>
      )}
    </div>
  );
}

export function WebsiteEditor({ tenantId, initial }: { tenantId: string; initial: PublicWebsiteData }) {
  const [draft, setDraft] = useState<PublicWebsiteData>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function patchSection<K extends WebsiteSectionKey | "footer">(
    key: K,
    patch: Partial<PublicWebsiteData["sections"][K]>,
  ) {
    setDraft((current) => ({
      ...current,
      sections: { ...current.sections, [key]: { ...current.sections[key], ...patch } },
    }));
  }

  function move(key: WebsiteSectionKey, direction: -1 | 1) {
    setDraft((current) => {
      const order = [...current.sectionOrder];
      const index = order.indexOf(key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= order.length) return current;
      [order[index], order[target]] = [order[target]!, order[index]!];
      return { ...current, sectionOrder: order };
    });
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const saved = await saveWebsiteConfig(tenantId, {
        navigation: draft.navigation,
        sections: draft.sections,
        sectionOrder: draft.sectionOrder,
        contact: draft.contact,
        socialLinks: draft.socialLinks,
        seo: draft.seo,
      });
      setDraft(saved);
      setMessage("Saved — the public website reflects this now.");
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  const s = draft.sections;

  return (
    <div className="space-y-5">
      <Panel title="Sections — visibility & order">
        <ul className="space-y-2">
          {draft.sectionOrder.map((key, index) => (
            <li key={key} className="flex items-center gap-3 border border-line bg-ink px-3.5 py-2.5">
              <span className="font-mono text-[10px] text-dim">{String(index + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-[13px] font-medium text-paper">{SECTION_LABELS[key]}</span>
              <button
                type="button"
                onClick={() => patchSection(key, { enabled: !s[key].enabled } as never)}
                className={`border px-2.5 py-1 font-mono text-[9.5px] tracking-[0.15em] uppercase transition-colors ${
                  s[key].enabled ? "border-mint/40 text-mint" : "border-line text-dim"
                }`}
              >
                {s[key].enabled ? "On" : "Off"}
              </button>
              <button type="button" onClick={() => move(key, -1)} aria-label={`Move ${SECTION_LABELS[key]} up`} disabled={index === 0} className="border border-line p-1.5 text-dim transition-colors hover:text-paper disabled:opacity-30">
                <ArrowUp className="h-3 w-3" />
              </button>
              <button type="button" onClick={() => move(key, 1)} aria-label={`Move ${SECTION_LABELS[key]} down`} disabled={index === draft.sectionOrder.length - 1} className="border border-line p-1.5 text-dim transition-colors hover:text-paper disabled:opacity-30">
                <ArrowDown className="h-3 w-3" />
              </button>
            </li>
          ))}
          <li className="flex items-center gap-3 border border-dashed border-line px-3.5 py-2.5 opacity-70">
            <span className="font-mono text-[10px] text-dim">—</span>
            <span className="flex-1 text-[13px] text-fog">Footer (always last)</span>
            <button
              type="button"
              onClick={() => patchSection("footer", { enabled: !s.footer.enabled })}
              className={`border px-2.5 py-1 font-mono text-[9.5px] tracking-[0.15em] uppercase ${s.footer.enabled ? "border-mint/40 text-mint" : "border-line text-dim"}`}
            >
              {s.footer.enabled ? "On" : "Off"}
            </button>
          </li>
        </ul>
      </Panel>

      <Panel title="Hero">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Headline" value={s.hero.headline} maxLength={140} onChange={(v) => patchSection("hero", { headline: v })} />
          <TextField label="CTA label" value={s.hero.ctaLabel} maxLength={40} onChange={(v) => patchSection("hero", { ctaLabel: v })} />
          <TextField label="CTA destination" value={s.hero.ctaHref} maxLength={200} onChange={(v) => patchSection("hero", { ctaHref: v })} />
          <TextField label="Image URL" value={s.hero.imageUrl ?? ""} placeholder="https://…" onChange={(v) => patchSection("hero", { imageUrl: v })} />
        </div>
        <div className="mt-4">
          <TextArea label="Subheadline" value={s.hero.subtext} maxLength={300} onChange={(v) => patchSection("hero", { subtext: v })} />
        </div>
      </Panel>

      <Panel title="Services">
        <TextField label="Section title" value={s.services.title} maxLength={80} onChange={(v) => patchSection("services", { title: v })} />
        <div className="mt-4">
          <CardListEditor items={s.services.items} limit={WEBSITE_LIMITS.services} noun="service" onChange={(items) => patchSection("services", { items })} />
        </div>
      </Panel>

      <Panel title="About">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Title" value={s.about.title} maxLength={80} onChange={(v) => patchSection("about", { title: v })} />
          <TextField label="Image URL" value={s.about.imageUrl ?? ""} placeholder="https://…" onChange={(v) => patchSection("about", { imageUrl: v })} />
        </div>
        <div className="mt-4">
          <TextArea label="Description" rows={5} maxLength={2000} value={s.about.text ?? ""} onChange={(v) => patchSection("about", { text: v })} />
        </div>
      </Panel>

      <Panel title="Why choose us">
        <TextField label="Section title" value={s.features.title} maxLength={80} onChange={(v) => patchSection("features", { title: v })} />
        <div className="mt-4">
          <CardListEditor items={s.features.items} limit={WEBSITE_LIMITS.features} noun="feature" onChange={(items) => patchSection("features", { items })} />
        </div>
      </Panel>

      <Panel title="Tracking CTA">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Heading" value={s.tracking.heading} maxLength={120} onChange={(v) => patchSection("tracking", { heading: v })} />
          <TextField label="Button label" value={s.tracking.ctaLabel} maxLength={40} onChange={(v) => patchSection("tracking", { ctaLabel: v })} />
        </div>
        <div className="mt-4">
          <TextArea label="Supporting text" value={s.tracking.subtext} maxLength={300} onChange={(v) => patchSection("tracking", { subtext: v })} />
        </div>
      </Panel>

      <Panel title="Contact">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Phone" value={draft.contact.phone ?? ""} onChange={(v) => setDraft((c) => ({ ...c, contact: { ...c.contact, phone: v } }))} />
          <TextField label="Email" type="email" value={draft.contact.email ?? ""} onChange={(v) => setDraft((c) => ({ ...c, contact: { ...c.contact, email: v } }))} />
          <TextField label="Address" value={draft.contact.address ?? ""} onChange={(v) => setDraft((c) => ({ ...c, contact: { ...c.contact, address: v } }))} />
        </div>
        <div className="mt-4">
          <TextField label="Business hours" value={s.contact.hours ?? ""} placeholder="Mon–Fri, 08:00–18:00" onChange={(v) => patchSection("contact", { hours: v })} />
        </div>
      </Panel>

      <Panel title="Footer & social">
        <TextField label="Footer text" value={s.footer.text ?? ""} maxLength={300} onChange={(v) => patchSection("footer", { text: v })} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Toggle label="Show navigation column" checked={s.footer.showNavigation} onChange={(v) => patchSection("footer", { showNavigation: v })} />
          <Toggle label="Show social links" checked={s.footer.showSocial} onChange={(v) => patchSection("footer", { showSocial: v })} />
        </div>
        <div className="mt-4 space-y-3">
          {draft.socialLinks.map((link, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-[12rem_1fr_auto]">
              <input value={link.platform} maxLength={40} aria-label="Platform" onChange={(e) => setDraft((c) => ({ ...c, socialLinks: c.socialLinks.map((l, i) => (i === index ? { ...l, platform: e.target.value } : l)) }))} className={fieldClass} />
              <input value={link.url} maxLength={300} aria-label="URL" placeholder="https://…" onChange={(e) => setDraft((c) => ({ ...c, socialLinks: c.socialLinks.map((l, i) => (i === index ? { ...l, url: e.target.value } : l)) }))} className={fieldClass} />
              <button type="button" aria-label={`Remove social link ${index + 1}`} onClick={() => setDraft((c) => ({ ...c, socialLinks: c.socialLinks.filter((_, i) => i !== index) }))} className="border border-line px-2.5 text-dim transition-colors hover:border-crimson/60 hover:text-crimson">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {draft.socialLinks.length < WEBSITE_LIMITS.socialLinks ? (
            <button type="button" onClick={() => setDraft((c) => ({ ...c, socialLinks: [...c.socialLinks, { platform: "LinkedIn", url: "https://" }] }))} className="inline-flex items-center gap-2 border border-line px-3.5 py-2 font-mono text-[10px] tracking-[0.18em] text-fog uppercase transition-colors hover:border-paper/40 hover:text-paper">
              <Plus className="h-3 w-3" /> Add social link
            </button>
          ) : null}
        </div>
      </Panel>

      <Panel title="SEO">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Page title" value={draft.seo.title ?? ""} maxLength={70} onChange={(v) => setDraft((c) => ({ ...c, seo: { ...c.seo, title: v } }))} />
          <TextField label="Open Graph title" value={draft.seo.ogTitle ?? ""} maxLength={70} onChange={(v) => setDraft((c) => ({ ...c, seo: { ...c.seo, ogTitle: v } }))} />
        </div>
        <div className="mt-4 grid gap-4">
          <TextArea label="Meta description" value={draft.seo.description ?? ""} maxLength={200} onChange={(v) => setDraft((c) => ({ ...c, seo: { ...c.seo, description: v } }))} />
          <TextArea label="Open Graph description" value={draft.seo.ogDescription ?? ""} maxLength={200} onChange={(v) => setDraft((c) => ({ ...c, seo: { ...c.seo, ogDescription: v } }))} />
          <TextField label="Open Graph image URL" value={draft.seo.ogImageUrl ?? ""} placeholder="https://…" onChange={(v) => setDraft((c) => ({ ...c, seo: { ...c.seo, ogImageUrl: v } }))} />
        </div>
        <p className="mt-3 font-mono text-[10px] leading-4 text-dim">
          Text fields stay text — markup is rejected server-side. Tracking
          pages remain noindex. No sitemap.xml / robots.txt by design.
        </p>
      </Panel>

      <SaveBar busy={busy} message={message} error={error} onSave={save} label="Save website" />
    </div>
  );
}
