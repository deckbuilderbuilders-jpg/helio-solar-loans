import { Link } from "@tanstack/react-router";
import { econOf, livePoints, noteStatus, raised } from "@/lib/helio/ledger";
import { GROUP_UTILITY } from "@/lib/helio/rec";
import type { HelioNote } from "@/lib/helio/types";
import { EconomicsLine } from "./Economics";
import { Pill, Progress, Stat, StageChip, pct, usd } from "./ui";

export function NoteCard({ n }: { n: HelioNote; now?: number }) {
  const e = econOf(n);
  const status = noteStatus(n);
  const r = raised(n);
  const open = n.stage === 1 && !n.failed;
  return (
    <Link to="/project/$id" params={{ id: n.id }} className="panel group flex flex-col gap-4 p-5 transition-colors hover:border-volt/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow">{n.city} · {GROUP_UTILITY[n.rec.group]}</div>
          <h3 className="truncate text-lg font-medium group-hover:text-volt">{n.name}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StageChip stage={n.stage} />
          <Pill state={status} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="APR" value={pct(n.apr, 2)} sub={open ? `${livePoints(n).toFixed(2)}x WATTS · early fill` : "fixed at creation"} accent />
        <Stat label="Coverage" value={`${e.coverage.toFixed(2)}x`} sub={`${usd(e.totalCash)} cash`} />
        <Stat label="System" value={`${n.kwDc} kW`} sub={`+ ${n.batteryKwh} kWh storage`} />
      </div>
      <div className="space-y-1.5">
        <Progress value={n.stage >= 2 ? e.buildCost : r} total={e.buildCost} />
        <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
          <span className="text-foreground">
            {usd(n.stage >= 2 ? e.buildCost : r)} / {usd(e.buildCost)} funded
          </span>
          <span>{e.rec.quantity} RECs × ${e.rec.price.toFixed(2)}</span>
        </div>
      </div>
      <EconomicsLine n={n} />
    </Link>
  );
}
