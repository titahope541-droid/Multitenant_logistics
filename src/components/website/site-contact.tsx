import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { PublicWebsiteData } from "@/types/website";

/** Contact — configured values only, semantic tel:/mailto:/address. */
export function SiteContact({ data }: { data: PublicWebsiteData }) {
  const { contact } = data;
  const hours = data.sections.contact.hours;
  if (!data.sections.contact.enabled) return null;
  if (!contact.phone && !contact.email && !contact.address && !hours) return null;

  const cardClass =
    "flex h-full items-start gap-3 border border-black/10 p-5 transition-colors hover:border-neutral-400";

  return (
    <section id="contact" className="border-b border-black/10 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-[11px] font-semibold tracking-[0.25em] uppercase" style={{ color: "var(--brand)" }}>
          Contact
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
          Talk to {data.companyName}.
        </h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contact.phone ? (
            <li>
              <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className={cardClass}>
                <Phone className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--brand)" }} strokeWidth={1.5} />
                <span>
                  <span className="block text-[11px] font-semibold tracking-[0.2em] opacity-50 uppercase">Phone</span>
                  <span className="mt-1 block text-[14px] font-medium">{contact.phone}</span>
                </span>
              </a>
            </li>
          ) : null}
          {contact.email ? (
            <li>
              <a href={`mailto:${contact.email}`} className={cardClass}>
                <Mail className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--brand)" }} strokeWidth={1.5} />
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold tracking-[0.2em] opacity-50 uppercase">Email</span>
                  <span className="mt-1 block truncate text-[14px] font-medium">{contact.email}</span>
                </span>
              </a>
            </li>
          ) : null}
          {contact.address ? (
            <li className={cardClass}>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--brand)" }} strokeWidth={1.5} />
              <span>
                <span className="block text-[11px] font-semibold tracking-[0.2em] opacity-50 uppercase">Address</span>
                <address className="mt-1 block text-[14px] leading-6 font-medium not-italic">{contact.address}</address>
              </span>
            </li>
          ) : null}
          {hours ? (
            <li className={cardClass}>
              <Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--brand)" }} strokeWidth={1.5} />
              <span>
                <span className="block text-[11px] font-semibold tracking-[0.2em] opacity-50 uppercase">Hours</span>
                <span className="mt-1 block text-[14px] leading-6 font-medium whitespace-pre-line">{hours}</span>
              </span>
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
