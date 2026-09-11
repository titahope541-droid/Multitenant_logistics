import { PACKAGE_STATUS_META, type PackageStatus } from "@/types/domain";

/**
 * Dispatch ticker — a marquee of synthetic tracking IDs cycling through the
 * five locked statuses. Purely presentational foreshadowing of Phase 5.
 */

const SHIPMENTS: Array<{ id: string; status: PackageStatus; route: string }> = [
  { id: "MRD-0017-KX", status: "IN_TRANSIT", route: "LOS → ABV" },
  { id: "MRD-8842-XD", status: "PROCESSED", route: "ACC → LHR" },
  { id: "MRD-2290-JA", status: "PENDING", route: "NBO → DAR" },
  { id: "MRD-5518-QW", status: "ARRIVED_AT_FACILITY", route: "DXB → BOM" },
  { id: "MRD-7731-ZM", status: "DELIVERED", route: "JFK → YYZ" },
  { id: "MRD-3306-HB", status: "IN_TRANSIT", route: "SIN → SYD" },
  { id: "MRD-9154-PC", status: "PROCESSED", route: "CDG → AMS" },
  { id: "MRD-4477-TV", status: "PENDING", route: "GRU → EZE" },
];

function TickerRow() {
  return (
    <div className="flex shrink-0 items-center">
      {SHIPMENTS.map((shipment) => (
        <span
          key={shipment.id}
          className="flex items-center gap-3 px-8 font-mono text-[11px] tracking-[0.14em] whitespace-nowrap"
        >
          <span className="text-paper">{shipment.id}</span>
          <span className="text-dim">{shipment.route}</span>
          <span className="text-signal">
            {PACKAGE_STATUS_META[shipment.status].label.toUpperCase()}
          </span>
          <span className="text-line-strong">·</span>
        </span>
      ))}
    </div>
  );
}

export function Ticker() {
  return (
    <div className="edge-fade overflow-hidden border-y border-line bg-panel py-3">
      <div className="flex w-max animate-marquee">
        <TickerRow />
        <TickerRow />
      </div>
    </div>
  );
}
