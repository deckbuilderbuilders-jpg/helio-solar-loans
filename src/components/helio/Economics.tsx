import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { LOCKUP_MAX_DAYS, noteInterest } from "@/lib/helio/auction";
import {
  APR_MAX,
  APR_MIN,
  BATTERY_COST_PER_KWH,
  BATTERY_REBATE_PER_KWH,
  COVERAGE_FULL,
  COVERAGE_MIN,
  CREATOR_TOTAL_MULTIPLE,
  FACTOR_ADVANCE,
  SOLAR_COST_PER_W_DC,
  batteryForSize,
  payoutPerDollar,
  projectEconomics,
  type ProjectEconomics,
} from "@/lib/helio/economics";
import { econOf } from "@/lib/helio/ledger";
import { GROUP_LABEL, type RecGroup } from "@/lib/helio/rec";
import type { HelioNote } from "@/lib/helio/types";
import { cn } from "@/lib/utils";
import { Row, pct, usd } from "./ui";

/** Every dollar shows its source. */
export function EconomicsLine({ n, className }: { n: HelioNote; className?: string }) {
  const e = econOf(n);
  return (
    <p className={cn("text-[11px] leading-relaxed text-muted-foreground", className)}>
      Build <span className="num text-foreground">{n.kwDc} kW × ${SOLAR_COST_PER_W_DC.toFixed(2)}/W</span> +{" "}
      <span className="num text-foreground">{n.batteryKwh} kWh × ${BATTERY_COST_PER_KWH}</span>. REC contract{" "}
      <span className="num text-foreground">{e.rec.quantity} RECs × ${e.rec.price.toFixed(2)}</span> ({GROUP_LABEL[n.rec.group]}, {n.rec.kwAc} kW-AC, CF{" "}
      {pct(n.rec.capacityFactor, 2)}). Rebates fixed at $300/kW + {n.batteryKwh} kWh × ${BATTERY_REBATE_PER_KWH}.
    </p>
  );
}

export function RecBreakdown({ e }: { e: ProjectEconomics }) {
  const r = e.rec;
  const i = e.recInputs;
  return (
    <div>
      <div className="eyebrow mb-2">REC contract (Illinois Shines {i.programYear})</div>
      <Row label="Size / bin" sub={`${r.category} · ${GROUP_LABEL[i.group]}`} value={`${i.kwAc} kW-AC · ${r.binLabel}`} />
      <Row label="Quantity" sub={r.qtySource === "Part I/II" ? `lesser of Part I/II · estimate ${r.estimatedQty}` : `15 yr × CF ${pct(i.capacityFactor, 2)}, −0.5%/yr, floored`} value={`${r.quantity} RECs`} />
      <Row label="Price" sub={`base $${r.basePrice.toFixed(2)}${i.customerOwned ? " + $20 customer-owned" : ""}${i.eec ? " + $5 EEC" : ""}`} value={`$${r.price.toFixed(2)}/REC`} />
      <Row label="Contract value" value={usd(r.contractValue)} strong />
    </div>
  );
}

export function EconomicsTable({ e, days = LOCKUP_MAX_DAYS }: { e: ProjectEconomics; days?: number }) {
  const interest = noteInterest(e.buildCost, e.apr, days);
  const left = e.totalCash - e.buildCost - interest - e.creatorTotal - e.installerFactorShare;
  return (
    <div className="grid gap-6 md:grid-cols-4">
      <div>
        <div className="eyebrow mb-2">Build (lender principal)</div>
        <Row label="Solar hardware" sub="$0.80/W-DC" value={usd(e.solarCost - e.installerBase - e.installerDayOneBonus)} />
        <Row label="Installer base" sub="$0.33/W-DC" value={usd(e.installerBase)} />
        <Row label="Day-one bonus" sub="$0.02/W-DC, if built in one day" value={usd(e.installerDayOneBonus)} />
        <Row label="Storage" sub={`${e.batteryKwh} kWh × $225 + $25 install`} value={usd(e.batteryCost)} />
        <Row label="Note size" value={usd(e.buildCost)} strong />
      </div>
      <RecBreakdown e={e} />
      <div>
        <div className="eyebrow mb-2">Cash at day 90–120</div>
        <Row label="Ameren solar rebate" sub="$300/kW-DC, fixed" value={usd(e.amerenSolarRebate)} />
        <Row label="Ameren storage rebate" sub="$300/kWh" value={usd(e.amerenBatteryRebate)} />
        <Row label="First REC payment" sub={`${pct(e.rec.firstPct, 0)} at energization`} value={usd(e.firstRecPayment)} />
        <Row label="Collateral held (5%)" sub="released later to HELIO" value={`− ${usd(e.recCollateral)}`} muted />
        <Row label="Factored REC tail" sub={`${usd(e.factorFace)} face × ${pct(FACTOR_ADVANCE, 0)}`} value={usd(e.factorProceeds)} />
        <Row label="Total cash" sub={`${e.coverage.toFixed(2)}x of build`} value={usd(e.totalCash)} strong />
      </div>
      <div>
        <div className="eyebrow mb-2">Waterfall</div>
        <Row label="Lender principal" value={usd(e.buildCost)} />
        <Row label={`Interest @ ${pct(e.apr, 2)}, ${days}d`} value={usd(interest)} />
        <Row label={`Creator ${CREATOR_TOTAL_MULTIPLE}x cash`} value={usd(e.creatorTotal)} muted />
        <Row label="Installer 7% of factor" value={usd(e.installerFactorShare)} muted />
        <Row label="HELIO" sub="+ collateral later · customer PPA" value={usd(Math.max(0, left))} muted />
      </div>
    </div>
  );
}

export function EconomicsCalculator() {
  const [kw, setKw] = useState(10);
  const [cf, setCf] = useState(0.1642);
  const [group, setGroup] = useState<RecGroup>("A");
  const e = useMemo(() => projectEconomics(kw, batteryForSize(kw), { capacityFactor: cf, group }), [kw, cf, group]);
  return (
    <div className="panel space-y-6 p-5">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>System size</span>
            <span className="num">{kw} kW-DC + {batteryForSize(kw)} kWh</span>
          </div>
          <Slider min={4} max={25} step={1} value={[kw]} onValueChange={(v) => setKw(v[0] ?? 10)} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Capacity factor</span>
            <span className="num">{pct(cf, 1)}</span>
          </div>
          <Slider min={12} max={19} step={0.1} value={[cf * 100]} onValueChange={(v) => setCf((v[0] ?? 16.42) / 100)} />
        </div>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>{group === "B" ? "Group B · ComEd" : "Group A · Ameren"}</span>
          <Switch checked={group === "B"} onCheckedChange={(b) => setGroup(b ? "B" : "A")} />
        </label>
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <span>Coverage <span className="num text-foreground">{e.coverage.toFixed(2)}x</span></span>
        <span>APR <span className="num text-volt">{e.listable ? pct(e.apr, 2) : "not listable"}</span></span>
        <span className="text-muted-foreground">
          {pct(APR_MAX, 0)} at {COVERAGE_MIN.toFixed(2)}x → {pct(APR_MIN, 0)} at {COVERAGE_FULL.toFixed(2)}x · $1 → ${payoutPerDollar(e.apr, 120).toFixed(3)} in 120 days
        </span>
      </div>
      <EconomicsTable e={e} />
    </div>
  );
}

export { econOf };
