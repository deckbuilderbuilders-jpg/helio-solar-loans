import { Link } from "@tanstack/react-router";
import { PANEL_PRICE_USDC } from "@/lib/helio/constants";
import { distributedToShares, projectStatus } from "@/lib/helio/ledger";
import type { HelioProject } from "@/lib/helio/types";
import { BasisLine } from "./Basis";
import { GateChip, Pill, Progress, Stat, dateShort, usd } from "./ui";

export function ProjectCard({ p }: { p: HelioProject }) {
  const status = projectStatus(p);
  const raised = p.panelsBonded * PANEL_PRICE_USDC;
  const paid = distributedToShares(p);
  return (
    <Link to="/project/$id" params={{ id: p.id }} className="panel group flex flex-col gap-4 p-5 transition-colors hover:border-volt/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow">{p.city} · Ameren Illinois {p.rateClass}</div>
          <h3 className="truncate text-lg font-medium group-hover:text-volt">{p.name}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <GateChip gate={p.gate} />
          <Pill state={status} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="System" value={`${p.specs.kwAc} kW`} sub={`${p.specs.kwDc} kW-DC${p.specs.batteryKwh ? ` · ${p.specs.batteryKwh} kWh` : ""}`} />
        <Stat label="Raised" value={usd(raised)} sub={`of ${usd(p.fundingTarget)}`} />
        <Stat label="Takeout" value={usd(p.takeout.takeout)} sub={paid > 0 ? `${usd(paid)} paid` : "contracted"} accent />
      </div>

      <div className="space-y-1.5">
        <Progress value={p.panelsBonded} total={p.panelsRequired} />
        <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
          <span className="text-foreground">
            {p.panelsBonded}/{p.panelsRequired} panels bonded
          </span>
          <span>Trade Date {dateShort(p.tradeDate)}</span>
        </div>
      </div>

      <BasisLine t={p.takeout} />
    </Link>
  );
}
