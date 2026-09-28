import { Link } from "@tanstack/react-router";
import { APR_CAP } from "@/lib/helio/auction";
import { econOf, liveApr, noteStatus, raised } from "@/lib/helio/ledger";
import type { HelioNote } from "@/lib/helio/types";
import { EconomicsLine } from "./Economics";
import { Pill, Progress, Stat, StageChip, pct, usd } from "./ui";

export function NoteCard({ n, now }: { n: HelioNote; now: number }) {
  const e = econOf(n);
  const status = noteStatus(n);
  const r = raised(n);
  const apr = liveApr(n, now);
  const open = n.stage === 1 && !n.failed;
  return (
    <Link to="/project/$id" params={{ id: n.id }} className="panel group flex flex-col gap-4 p-5 transition-colors hover:border-volt/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow">{n.city} · Ameren Illinois</div>
          <h3 className="truncate text-lg font-medium group-hover:text-volt">{n.name}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StageChip stage={n.stage} />
          <Pill state={status} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="System" value={`${n.kwDc} kW`} sub={`+ ${n.batteryKwh} kWh storage`} />
        <Stat label={open ? "Live APR" : "Clearing APR"} value={pct(apr, 2)} sub={open ? `cap ${pct(APR_CAP, 0)}` : "locked"} accent />
        <Stat label="Takeout" value={usd(e.takeout)} sub={`${e.takeoutCoverage.toFixed(2)}x of build`} />
      </div>
      <div className="space-y-1.5">
        <Progress value={n.stage >= 2 ? e.buildCost : r} total={e.buildCost} />
        <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
          <span className="text-foreground">
            {usd(n.stage >= 2 ? e.buildCost : r)} / {usd(e.buildCost)} funded
          </span>
          <span>fee {usd(n.applicationFee)}</span>
        </div>
      </div>
      <EconomicsLine n={n} />
    </Link>
  );
}
