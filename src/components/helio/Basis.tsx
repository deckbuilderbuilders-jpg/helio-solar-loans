import type { TakeoutBreakdown } from "@/lib/helio/takeout";
import { cn } from "@/lib/utils";

/** Every dollar shows its source: ILS price tier, adder flags, Ameren rebate basis. */
export function BasisLine({ t, className }: { t: TakeoutBreakdown; className?: string }) {
  return (
    <p className={cn("text-[11px] leading-relaxed text-muted-foreground", className)}>
      <span className="num text-foreground">${t.basePrice.toFixed(2)}</span> Illinois Shines Group A {t.tierLabel}
      {t.customerOwnedAdder > 0 && (
        <>
          {" "}
          + <span className="num text-foreground">$20</span> customer-owned
        </>
      )}
      {t.eecAdder > 0 && (
        <>
          {" "}
          + <span className="num text-foreground">$5</span> EEC
        </>
      )}{" "}
      = <span className="num text-volt">${t.effectivePrice.toFixed(2)}/REC</span> ·{" "}
      <span className="num text-foreground">{t.totalRecs}</span> RECs over 15 yrs ·{" "}
      {Math.round(t.firstPaymentPct * 100)}% at Part II · Ameren <span className="num text-foreground">${t.specs.kwDc.toFixed(2)} kW-DC × $300</span>
      {t.amerenBatteryRebate > 0 && (
        <>
          {" "}
          + <span className="num text-foreground">{t.specs.batteryKwh} kWh × $300</span> battery
        </>
      )}
      .
    </p>
  );
}
