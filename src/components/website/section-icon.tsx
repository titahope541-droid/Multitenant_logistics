import {
  BadgeCheck,
  Clock,
  Globe,
  Headset,
  MapPin,
  Package,
  Plane,
  Route,
  Ship,
  Shield,
  Truck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import type { WebsiteIcon } from "@/lib/website-defaults";

/**
 * Controlled icon vocabulary → components. Tenants pick an identifier
 * from a fixed list; no markup, no uploads, no arbitrary SVG.
 */
const ICONS: Record<WebsiteIcon, LucideIcon> = {
  truck: Truck,
  package: Package,
  plane: Plane,
  ship: Ship,
  warehouse: Warehouse,
  clock: Clock,
  shield: Shield,
  globe: Globe,
  "map-pin": MapPin,
  headset: Headset,
  "badge-check": BadgeCheck,
  route: Route,
};

export function SectionIcon({ icon, className }: { icon?: WebsiteIcon; className?: string }) {
  const Component = icon ? ICONS[icon] : Truck;
  return <Component className={className} strokeWidth={1.5} aria-hidden="true" />;
}
