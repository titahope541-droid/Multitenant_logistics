import { SectionIcon } from "@/components/website/section-icon";
import type { PublicWebsiteData, WebsiteCardItem } from "@/types/website";

/** Cards section shared by Services and Features — configuration only. */
export function SiteCards({
  id,
  eyebrow,
  title,
  items,
  tone = "light",
}: {
  id: string;
  eyebrow: string;
  title: string;
  items: WebsiteCardItem[];
  tone?: "light" | "muted";
}) {
  const visible = items.filter((item) => item.visible);
  if (visible.length === 0) return null;

  return (
    <section id={id} className={`border-b border-black/10 ${tone === "muted" ? "bg-neutral-50" : "bg-white"}`}>
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-[11px] font-semibold tracking-[0.25em] uppercase" style={{ color: "var(--brand)" }}>
          {eyebrow}
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-[-0.02em] sm:text-4xl">{title}</h2>
        <div className="mt-10 grid gap-px border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((item) => (
            <article key={item.title} className={tone === "muted" ? "bg-neutral-50 p-6" : "bg-white p-6"}>
              <span
                className="flex h-10 w-10 items-center justify-center text-white"
                style={{ backgroundColor: "var(--brand)", borderRadius: "var(--brand-radius)" }}
              >
                <SectionIcon icon={item.icon} className="h-4.5 w-4.5" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold">{item.title}</h3>
              {item.description ? (
                <p className="mt-2 text-[13px] leading-6 opacity-70">{item.description}</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SiteServices({ data }: { data: PublicWebsiteData }) {
  const { services } = data.sections;
  if (!services.enabled) return null;
  return <SiteCards id="services" eyebrow="Services" title={services.title} items={services.items} />;
}

export function SiteFeatures({ data }: { data: PublicWebsiteData }) {
  const { features } = data.sections;
  if (!features.enabled) return null;
  return (
    <SiteCards id="features" eyebrow="Why choose us" title={features.title} items={features.items} tone="muted" />
  );
}
