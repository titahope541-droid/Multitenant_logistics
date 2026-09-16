import { SiteImage } from "@/components/website/site-image";
import type { PublicWebsiteData } from "@/types/website";

/** About — configured title/text/image; hidden when there is no content. */
export function SiteAbout({ data }: { data: PublicWebsiteData }) {
  const { about } = data.sections;
  if (!about.enabled || (!about.text && !about.imageUrl)) return null;

  return (
    <section id="about" className="border-b border-black/8 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p
          className="text-[12px] font-semibold tracking-[0.18em] uppercase"
          style={{ color: "var(--brand)" }}
        >
          {about.title}
        </p>

        <div className="mt-6 grid items-center gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-14">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.025em] text-neutral-900 sm:text-4xl">
              {data.companyName}
            </h2>
            {about.text ? (
              <p className="mt-5 max-w-2xl text-[15px] leading-8 whitespace-pre-line text-neutral-600">
                {about.text}
              </p>
            ) : null}
          </div>

          {about.imageUrl ? (
            <SiteImage
              src={about.imageUrl}
              alt={`${data.companyName} operations`}
              className="aspect-[4/3] w-full rounded-2xl object-cover shadow-sm"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
