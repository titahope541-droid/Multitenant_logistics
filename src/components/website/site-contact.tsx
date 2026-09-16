import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { PublicWebsiteData } from "@/types/website";

/**
 * Contact — configured values only (never fabricated). Semantic
 * tel:/mailto: links and <address>, plus social links where configured.
 */
export function SiteContact({ data }: { data: PublicWebsiteData }) {
  const { contact } = data;
  const hours = data.sections.contact.hours;
  if (!data.sections.contact.enabled) return null;
  if (!contact.phone && !contact.email && !contact.address && !hours && data.socialLinks.length === 0) {
    return null;
  }

  const cardClass =
    "flex h-full items-start gap-3 rounded-2xl border border-black/8 bg-white p-5 shadow-sm transition-shadow hover:shadow-md";

  return (
    <section id="contact" className="border-b border-black/8 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p
          className="text-[12px] font-semibold tracking-[0.18em] uppercase"
          style={{ color: "var(--brand)" }}
        >
          Contact
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-neutral-900 sm:text-4xl">
          Talk to {data.companyName}
        </h2>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contact.phone ? (
            <li>
              <a
                href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
                className={cardClass}
              >
                <Phone className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--brand)" }} strokeWidth={1.5} />
                <span>
                  <span className="block text-[11.5px] font-medium text-neutral-500">Phone</span>
                  <span className="mt-1 block text-[14px] font-medium text-neutral-900">
                    {contact.phone}
                  </span>
                </span>
              </a>
            </li>
          ) : null}

          {contact.email ? (
            <li>
              <a href={`mailto:${contact.email}`} className={cardClass}>
                <Mail className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--brand)" }} strokeWidth={1.5} />
                <span className="min-w-0">
                  <span className="block text-[11.5px] font-medium text-neutral-500">Email</span>
                  <span className="mt-1 block truncate text-[14px] font-medium text-neutral-900">
                    {contact.email}
                  </span>
                </span>
              </a>
            </li>
          ) : null}

          {contact.address ? (
            <li className={cardClass}>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--brand)" }} strokeWidth={1.5} />
              <span>
                <span className="block text-[11.5px] font-medium text-neutral-500">Address</span>
                <address className="mt-1 block text-[14px] leading-6 font-medium text-neutral-900 not-italic">
                  {contact.address}
                </address>
              </span>
            </li>
          ) : null}

          {hours ? (
            <li className={cardClass}>
              <Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--brand)" }} strokeWidth={1.5} />
              <span>
                <span className="block text-[11.5px] font-medium text-neutral-500">Hours</span>
                <span className="mt-1 block text-[14px] leading-6 font-medium whitespace-pre-line text-neutral-900">
                  {hours}
                </span>
              </span>
            </li>
          ) : null}
        </ul>

        {data.socialLinks.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {data.socialLinks.map((link) => (
              <li key={link.platform + link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-[13px] font-medium text-neutral-700 transition-colors hover:border-black/25 hover:text-neutral-900"
                >
                  {link.platform}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
