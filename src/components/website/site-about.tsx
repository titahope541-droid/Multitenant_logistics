import { SiteImage } from "@/components/website/site-image";
import type { PublicWebsiteData } from "@/types/website";

/** About — title/text/image from configuration; hidden when empty. */
export function SiteAbout({ data }: { data: PublicWebsiteData }) {
  const { about } = data.sections;
  if (!about.enabled || (!about.text && !about.imageUrl)) return null;

  return (
    <section id="about" className="border-b border-black/10 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-[11px] font-semibold tracking-[0.25em] uppercase" style={{ color: "var(--brand)" }}>
          {about.title}
        </p>
        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-[-0.02em] sm:text-4xl">{data.companyName}</h2>
            {about.text ? (
              <p className="mt-5 max-w-2xl text-[15px] leading-8 whitespace-pre-line opacity-75">{about.text}</p>
            ) : null}
          </div>
          {about.imageUrl ? (
            <SiteImage
              src={about.imageUrl}
              alt={`${data.companyName} operations`}
              className="aspect-[4/3] w-full object-cover"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
