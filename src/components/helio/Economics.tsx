import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { APR_CAP, APR_FLOOR, LOCKUP_MIN_DAYS, noteInterest } from "@/lib/helio/auction";
import {
  APPLICATION_FEE_PER_KW,
  BATTERY_COST_PER_KWH,
  BATTERY_REBATE_PER_KWH,
  CREATOR_CASH_MULTIPLE,
  CREATOR_YIELD_MULTIPLE,
  SOLAR_COST_PER_W_DC,
  TAIL_TO_HELIO,
  TAIL_TO_INSTALLER,
  TAIL_TO_YIELD,
  batteryForSize,
  projectEconomics,
  yieldNftAnnualRate,
  type ProjectEconomics,
} from "@/lib/helio/economics";
import { econOf } from "@/lib/helio/ledger";
import type { HelioNote } from "@/lib/helio/types";
import { cn } from "@/lib/utils";
import { Row, pct, usd } from "./ui";

/** Every dollar shows its source. */
export function EconomicsLine({ n, className }: { n: HelioNote; className?: string }) {
  return (
    <p className={cn("text-[11px] leading-relaxed text-muted-foreground", className)}>
      Build <span className="num text-foreground">{n.kwDc} kW × ${SOLAR_COST_PER_W_DC.toFixed(2)}/W</span> +{" "}
      <span className="num text-foreground">{n.batteryKwh} kWh × ${BATTERY_COST_PER_KWH}</span>. Takeout: Ameren{" "}
      <span className="num text-foreground">$300/kW-DC</span> + <span className="num text-foreground">{n.batteryKwh} kWh × ${BATTERY_REBATE_PER_KWH}</span> storage + Illinois
      Shines first 50% REC at <span className="num text-foreground">$0.845/W</span> (Group A 0–10 kW, customer-owned + EEC).
    </p>
  );
}

export function EconomicsTable({ e, apr, days = LOCKUP_MIN_DAYS }: { e: ProjectEconomics; apr: number; days?: number }) {
  const interest = noteInterest(e.buildCost, apr, days);
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div>
        <div className="eyebrow mb-2">Build (lender principal)</div>
        <Row label="Solar hardware" sub="$0.80/W-DC" value={usd(e.solarCost - e.installerBase - e.installerDayOneBonus)} />
        <Row label="Installer base" sub="$0.33/W-DC" value={usd(e.installerBase)} />
        <Row label="Day-one bonus" sub="$0.02/W-DC, if built in one day" value={usd(e.installerDayOneBonus)} />
        <Row label="Storage" sub={`${e.batteryKwh} kWh × $225 + $25 install`} value={usd(e.batteryCost)} />
        <Row label="Note size" value={usd(e.buildCost)} strong />
        <Row label="Application fee (creator)" sub={`$${APPLICATION_FEE_PER_KW}/kW, at risk`} value={usd(e.applicationFee)} muted />
      </div>
      <div>
        <div className="eyebrow mb-2">Day 90–120 takeout</div>
        <Row label="Ameren solar rebate" sub="$300/kW-DC" value={usd(e.amerenSolarRebate)} />
        <Row label="Ameren storage rebate" sub="$300/kWh" value={usd(e.amerenBatteryRebate)} />
        <Row label="First REC payment" sub="50% of 15-yr contract" value={usd(e.firstRecPayment)} />
        <Row label="Collateral held (5%)" sub={`of ${usd(e.recContractTotal)} contract · released later to Yield NFTs`} value={`− ${usd(e.recCollateral)}`} muted />
        <Row label="Cash that lands" value={usd(e.takeout)} strong />
        <Row label={`Lender interest @ ${pct(apr, 1)}, ${days}d`} value={`− ${usd(interest)}`} muted />
        <Row label={`Creator ${CREATOR_CASH_MULTIPLE}x cash`} value={`− ${usd(e.creatorCashBack)}`} muted />
        {(() => {
          const left = e.takeout - e.buildCost - interest - e.creatorCashBack;
          return left >= 0 ? (
            <Row label="Surplus to HELIO" value={usd(left)} muted />
          ) : (
            <Row label="Creator cash deferred" sub="paid from first REC-tail quarters" value={usd(-left)} muted />
          );
        })()}
      </div>
      <div>
        <div className="eyebrow mb-2">Long tail (per year)</div>
        <Row label="REC tail" sub="50% over 24 quarters" value={usd(e.recTailPerQuarter * 4)} />
        <Row label="Tail cash" value={usd(e.tailAnnual)} strong />
        <Row label="Collateral release" sub="one-time, 100% to Yield NFTs" value={usd(e.recCollateral)} />
        <Row label={`Yield NFTs ${pct(TAIL_TO_YIELD, 0)}`} value={usd(e.tailToYieldAnnual)} />
        <Row label={`HELIO ${pct(TAIL_TO_HELIO, 0)}`} sub="35% fee less installer" value={usd(e.tailToHelioAnnual)} muted />
        <Row label={`Installer ${pct(TAIL_TO_INSTALLER, 0)}`} sub="20% of HELIO fee" value={usd(e.tailToInstallerAnnual)} muted />
        <Row label={`Creator ${CREATOR_YIELD_MULTIPLE}x NFT credit`} value={usd(e.creatorYieldCredit)} muted />
        <Row label="Customer PPA → HELIO" sub={`${usd(e.ppaMonthly)}/mo · maintenance, not in NFT`} value={usd(e.ppaAnnual)} muted />
      </div>
    </div>
  );
}

export function EconomicsCalculator() {
  const [kw, setKw] = useState(10);
  const [apr, setApr] = useState(0.2);
  const e = useMemo(() => projectEconomics(kw, batteryForSize(kw)), [kw]);
  return (
    <div className="panel space-y-6 p-5">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>System size</span>
            <span className="num">{kw} kW-DC + {batteryForSize(kw)} kWh</span>
          </div>
          <Slider min={4} max={25} step={1} value={[kw]} onValueChange={(v) => setKw(v[0] ?? 10)} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Clearing APR</span>
            <span className="num">{pct(apr, 1)}</span>
          </div>
          <Slider min={APR_FLOOR * 100} max={APR_CAP * 100} step={0.5} value={[apr * 100]} onValueChange={(v) => setApr((v[0] ?? 20) / 100)} />
        </div>
      </div>
      <EconomicsTable e={e} apr={apr} />
      <p className="text-xs text-muted-foreground">
        Yield NFT cash-on-cash ≈ <span className="num text-foreground">{pct(yieldNftAnnualRate(e), 1)}</span> a year on note principal, on top of the bridge APR.
      </p>
    </div>
  );
}

export { econOf };
