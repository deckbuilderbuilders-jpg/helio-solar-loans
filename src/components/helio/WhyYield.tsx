import { Info } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MARKET_COMPS, OFFER_GRID, PROTOCOL_FEE_BPS } from "@/lib/helio/constants";
import { cn } from "@/lib/utils";

export const COMPARE_CHIP =
  "This 60-day coupon pays more than Kamino USDC (~3.5%) and sits inside real 2026 private-credit + factoring bands. Takeout is a tariffed rebate + a utility REC invoice, not a collection floor.";

export function CompareChip({ apyBps, termDays, className }: { apyBps: number; termDays: number; className?: string }) {
  const turn = ((apyBps / 10_000) * termDays * 100) / 365;
  const vsKamino = (apyBps / 100 / 3.5).toFixed(1);
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border border-volt/25 bg-volt/5 px-2.5 py-1.5 text-[11px] leading-snug text-muted-foreground", className)}>
      <span className="num text-volt">{turn.toFixed(2)}% per {termDays}-day turn</span>
      <span>·</span>
      <span>{vsKamino}× Kamino USDC (~3.5%)</span>
      <span>·</span>
      <span>inside Maple 8–18% / factoring 24–60% APR bands</span>
      <WhyYieldDrawer trigger={<button className="ml-auto inline-flex items-center gap-1 text-volt hover:underline"><Info className="size-3" /> why this yield</button>} />
    </div>
  );
}

export function WhyYieldDrawer({ trigger }: { trigger: React.ReactNode }) {
  const netApy = 24 * (1 - PROTOCOL_FEE_BPS / 10_000);
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Why 24%, and why 60 days</SheetTitle>
          <SheetDescription>
            Not Sharky&apos;s 100–360% NFT-vol tourism. Priced against mid-2026 stablecoin, private-credit and factoring markets.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 text-sm">
          <div>
            <div className="eyebrow mb-2">Market comps · mid-2026</div>
            <div className="space-y-2">
              {MARKET_COMPS.map((c) => (
                <div key={c.name} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border pb-2">
                  <div>
                    <div className="text-foreground">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">{c.kind}</div>
                  </div>
                  <div className="num text-right text-muted-foreground">{c.band}</div>
                </div>
              ))}
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-sm bg-volt/10 px-2 py-2">
                <div>
                  <div className="font-medium text-volt">HELIO G3 book</div>
                  <div className="text-[11px] text-muted-foreground">Ameren rebate + Illinois Shines REC invoice</div>
                </div>
                <div className="num text-right text-volt">24% APY · 60d</div>
              </div>
            </div>
          </div>

          <div>
            <div className="eyebrow mb-2">Yield bar</div>
            <div className="space-y-1.5">
              {[...MARKET_COMPS.map((c) => ({ n: c.name.split(" (")[0], l: c.low, h: c.high })), { n: "HELIO G3", l: 24, h: 24 }].map((c) => (
                <div key={c.n} className="grid grid-cols-[110px_1fr] items-center gap-2 text-[11px]">
                  <span className="truncate text-muted-foreground">{c.n}</span>
                  <div className="relative h-2 rounded-sm bg-surface-2">
                    <div
                      className={cn("absolute h-2 rounded-sm", c.n === "HELIO G3" ? "bg-volt" : "bg-muted-foreground/50")}
                      style={{ left: `${(c.l / 60) * 100}%`, width: `${Math.max(1.5, ((c.h - c.l) / 60) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-[110px_1fr] text-[10px] text-muted-foreground"><span /><div className="flex justify-between"><span>0%</span><span>30%</span><span>60% APR</span></div></div>
            </div>
          </div>

          <div>
            <div className="eyebrow mb-2">Default offer grid</div>
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left"><th className="py-1 font-normal">Gate</th><th className="font-normal">Term</th><th className="font-normal">APY</th><th className="font-normal">Orig.</th><th className="font-normal">LTV</th></tr>
              </thead>
              <tbody className="num">
                {OFFER_GRID.map((g) => (
                  <tr key={g.gate} className={cn("border-t border-border", g.gate === 3 && "text-volt")}>
                    <td className="py-1.5 font-sans">{g.gateLabel}</td>
                    <td>{g.termDays}d</td>
                    <td>{g.apyBps / 100}%</td>
                    <td>{g.originationBps / 100}%</td>
                    <td>{g.ltvBps / 100}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              {OFFER_GRID.map((g) => (<li key={g.gate}>· {g.gateLabel}: {g.why}</li>))}
            </ul>
          </div>

          <div className="rounded-sm border border-border bg-surface p-3 text-xs leading-relaxed text-muted-foreground">
            <p>24% for 60 days ≈ <span className="num text-foreground">3.95%</span> per turn. Six turns a year with capital always filled ≈ 24% simple — above Maple&apos;s top band, 4–7× Kamino USDC, and cheaper for the AV than construction progress-billing factoring at 2–5% per 30 days, because the debtor is Ameren plus the ABP contracting utility.</p>
            <p className="mt-2">Protocol fee: 10% of interest → lender net <span className="num text-foreground">{netApy.toFixed(1)}% APY</span>. Origination fee to treasury.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
