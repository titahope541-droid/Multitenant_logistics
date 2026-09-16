import { SectionIcon } from "@/components/website/section-icon";
import { SiteImage } from "@/components/website/site-image";
import type { PublicWebsiteData, WebsiteCardItem } from "@/types/website";

/** Card grid shared by Services and Features — configuration only. */
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
    <section
      id={id}
      className={`border-b border-black/8 ${tone === "muted" ? "bg-neutral-50" : "bg-white"}`}
    >
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p
          className="text-[12px] font-semibold tracking-[0.18em] uppercase"
          style={{ color: "var(--brand)" }}
        >
          {eyebrow}
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.025em] text-neutral-900 sm:text-4xl">
          {title}
        </h2>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <CardItemView key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CardItemView({ item }: { item: WebsiteCardItem }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm transition-shadow hover:shadow-md">
      {item.imageUrl ? (
        <SiteImage
          src={item.imageUrl}
          alt={item.title}
          className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <div className="flex aspect-[16/10] w-full items-center justify-center bg-neutral-50">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)" }}
          >
            <SectionIcon icon={item.icon} className="h-5 w-5" />
          </span>
        </div>
      )}

      <div className="p-6">
        {item.label ? (
          <span
            className="mb-3 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase"
            style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)" }}
          >
            {item.label}
          </span>
        ) : null}
        <h3 className="text-[16px] font-semibold text-neutral-900">{item.title}</h3>
        {item.description ? (
          <p className="mt-2 text-[14px] leading-6 text-neutral-600">{item.description}</p>
        ) : null}
      </div>
    </article>
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
    <SiteCards
      id="features"
      eyebrow="Why choose us"
      title={features.title}
      items={features.items}
      tone="muted"
    />
  );
}
