import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, FileCheck2, Landmark, Snowflake, Waves } from "lucide-react";
import { TakeoutCalculator } from "@/components/helio/Calculator";
import { SourcesPopover } from "@/components/helio/Sources";
import { Row, SectionHead, Stat, usd } from "@/components/helio/ui";
import { CompareChip, WhyYieldDrawer } from "@/components/helio/WhyYield";
import { Button } from "@/components/ui/button";
import { MARKET_COMPS, OFFER_GRID, PROTOCOL_FEE_BPS } from "@/lib/helio/constants";
import { effectiveState } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";
import { FLAGSHIP_SPECS, computeTakeout, quoteLoan } from "@/lib/helio/takeout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HELIO — 24% APY, 60-day USDC loans on Illinois solar takeouts" },
      { name: "description", content: "Fixed-term USDC loans against the Ameren rebate and first Illinois Shines REC check. No price liquidations. Solana devnet." },
      { property: "og:title", content: "HELIO — Illinois solar takeout credit on Solana" },
      { property: "og:description", content: "24% APY for 60 days, paid by a tariffed rebate and a utility REC invoice — not a JPEG floor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { icon: Landmark, title: "Lender posts USDC", body: "Choose a collection (A-SDG-10, A-SDG-25 …), set APY, term and minimum gate. USDC sits in the offer vault until taken." },
  { icon: FileCheck2, title: "AV lists a Project Note", body: "kW AC / kW DC / battery / adders → the engine computes the contracted takeout. A Token-2022 note is minted to the AV's wallet." },
  { icon: Snowflake, title: "Accept = freeze, not escrow", body: "Principal lands in the AV's wallet. The note stays there but is frozen to the program. Gate ≥ min, principal ≤ LTV × takeout — enforced on-chain." },
  { icon: Waves, title: "Takeout repays through the waterfall", body: "Ameren rebate + first REC check hit loan escrow → principal → interest (net 10% protocol) → residual back to the AV. Unpaid after expiry + 72h: lender forecloses on the claim." },
];

function Landing() {
  const { state, now } = useHelio();
  const t = computeTakeout(FLAGSHIP_SPECS);
  const g3 = OFFER_GRID[1];
  const q = quoteLoan(t.takeout, { ltvBps: g3.ltvBps, termDays: g3.termDays, apyBps: g3.apyBps, originationBps: g3.originationBps, protocolFeeBps: PROTOCOL_FEE_BPS });

  const open = state.offers.filter((o) => o.state === "Open");
  const live = state.loans.filter((l) => ["Active", "Extended", "Defaulted"].includes(effectiveState(l, now)));
  const openUsdc = open.reduce((s, o) => s + o.principal, 0);
  const liveUsdc = live.reduce((s, l) => s + l.principal, 0);
  const wAvg = open.length ? open.reduce((s, o) => s + o.apyBps * o.principal, 0) / openUsdc / 100 : 0;
  const totalTakeout = state.projects.reduce((s, p) => s + p.takeout.takeout, 0);

  return (
    <div className="grid-bg">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-14 md:pt-20">
        <div className="grid items-end gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="eyebrow mb-4 flex items-center gap-2">
              <span className="inline-block size-1.5 bg-volt" /> Illinois Shines 2026–27 · Group A · Ameren Illinois
            </div>
            <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl">
              <span className="text-volt">24% APY.</span>
              <br />60 days.
              <br /><span className="text-muted-foreground">Paid by the utility.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Sharky-style fixed-term USDC loans for Illinois solar installers, collateralised by the cash they are already owed:
              the <span className="text-foreground">Ameren $300/kW-DC rebate</span> and the <span className="text-foreground">first Illinois Shines REC payment</span>.
              No oracle. No mid-loan liquidation. No JPEG floor.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="volt" size="lg"><Link to="/lend">Open the order book <ArrowRight className="size-4" /></Link></Button>
              <Button asChild variant="outline" size="lg"><Link to="/borrow">Quote a project</Link></Button>
              <WhyYieldDrawer trigger={<Button variant="ghost" size="lg">Why this yield</Button>} />
            </div>
          </div>

          <div className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="eyebrow">Seeded devnet book</div>
              <span className="font-mono text-[10px] text-muted-foreground">live · ticks every second</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Open offers" value={open.length} sub={`${usd(openUsdc)} USDC waiting`} />
              <Stat label="Live loans" value={live.length} sub={`${usd(liveUsdc)} principal out`} accent />
              <Stat label="Book wtd. APY" value={`${wAvg.toFixed(1)}%`} sub="vs Kamino USDC ~3.5%" />
              <Stat label="Contracted takeout" value={usd(totalTakeout)} sub={`${state.projects.length} project notes`} />
            </div>
            <div className="mt-4 text-[11px] text-muted-foreground">
              No wallet yet? Use <span className="text-foreground">Connect → Load demo lender</span> in the header. Everything below runs against seeded state.
            </div>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section className="mx-auto max-w-7xl px-4 py-12" id="calculator">
        <SectionHead
          eyebrow="Takeout engine"
          title="What is this array actually owed?"
          right={<span className="hidden text-xs text-muted-foreground md:block">Every number derives from a cited Illinois rule. Toggle the adders.</span>}
        />
        <TakeoutCalculator />
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <SectionHead eyebrow="Mechanics" title="Four steps. One frozen note." />
        <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <s.icon className="size-5 text-volt" />
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <div className="font-display text-lg font-semibold">{s.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Rate comparison + P&L */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="panel p-5">
            <SectionHead eyebrow="Rate comparison · mid-2026" title="Where 24% sits" />
            <div className="space-y-2.5">
              {[...MARKET_COMPS, { name: "HELIO G3 book (Ameren rebate + REC invoice)", kind: "Tariffed takeout", band: "24% APY / 60d", low: 24, high: 24 }].map((c) => {
                const helio = c.name.startsWith("HELIO");
                return (
                  <div key={c.name} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                    <div className="min-w-0">
                      <div className={helio ? "font-medium text-volt" : ""}>{c.name}</div>
                      <div className="relative mt-1 h-1.5 rounded-sm bg-surface-2">
                        <div className={helio ? "absolute h-1.5 rounded-sm bg-volt" : "absolute h-1.5 rounded-sm bg-muted-foreground/40"} style={{ left: `${(c.low / 60) * 100}%`, width: `${Math.max(1.5, ((c.high - c.low) / 60) * 100)}%` }} />
                      </div>
                    </div>
                    <div className={`num text-right text-xs ${helio ? "text-volt" : "text-muted-foreground"}`}>{c.band}</div>
                  </div>
                );
              })}
            </div>
            <CompareChip apyBps={2400} termDays={60} className="mt-5" />
          </div>

          <div className="panel p-5">
            <div className="flex items-start justify-between gap-3">
              <SectionHead eyebrow="Flagship · 10 kW AC / 12 kW DC · customer-owned · EEC" title="Borrower P&L" />
              <SourcesPopover />
            </div>
            <div className="divide-y divide-border/60 text-sm">
              <Row label="Install cost due at PTO" sub="12 kW-DC × $1.00/W" value={`−${usd(t.installCost)}`} />
              <Row label="Ameren rebate" sub="~60 days post-PTO" value={usd(t.amerenSolarRebate)} />
              <Row label="First REC payment (50%)" sub={`${t.totalRecs} RECs × $${t.effectivePrice.toFixed(2)} × 50%`} value={usd(t.firstRecPayment)} />
              <Row label="Collateral lock + 3% reserve" value={`−${usd(t.recCollateralLock + t.protocolReserve)}`} muted />
              <Row label="Takeout" value={usd(t.takeout)} strong />
              <Row label="60-day loan today at 80% LTV" value={usd(q.principal)} />
              <Row label="Interest at 24% + 1.5% origination" value={`−${usd(q.interest + q.origination)}`} muted />
              <Row label="AV clears after takeout repays" value={usd(q.borrowerResidualAfterTakeout)} strong />
              <Row label="… and keeps the 6-year REC tail" sub="24 quarters · not lent in v1" value={usd(t.recTail)} />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Without HELIO the AV floats {usd(t.installCost)} for 5–10 months. With it, {usd(q.principal)} USDC lands the day the ICC trade date or PTO clears, and the utility pays the lender back.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-6">
        <div className="hazard flex flex-col items-start justify-between gap-4 rounded-sm p-6 md:flex-row md:items-center">
          <div>
            <div className="font-display text-2xl font-semibold">Ready to punch the demo?</div>
            <div className="text-sm text-muted-foreground">Post an offer, accept it as the AV, advance the gates in the oracle, watch the waterfall settle.</div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="volt"><Link to="/lend">Lend</Link></Button>
            <Button asChild variant="outline"><Link to="/oracle">Oracle panel</Link></Button>
          </div>
        </div>
      </section>
    </div>
  );
}
