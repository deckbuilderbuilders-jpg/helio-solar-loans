import { createFileRoute } from "@tanstack/react-router";
import { SOURCES } from "@/components/helio/Sources";
import { SectionHead } from "@/components/helio/ui";
import { GATES, GROUP_A_DG_REC_PRICES, OFFER_GRID } from "@/lib/helio/constants";
import { DEMO } from "@/lib/helio/seed";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Protocol docs — HELIO" },
      { name: "description", content: "How HELIO works: collection order book, frozen Project Note, milestone gates, takeout escrow waterfall, and the Illinois sources behind every number." },
      { property: "og:title", content: "HELIO protocol docs" },
      { property: "og:description", content: "Short protocol spec and the Illinois Shines / Ameren sources encoded in the takeout engine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Docs,
});

const IX = [
  ["initialize", "admin, USDC mint, fee bps, treasury"],
  ["create_collection", "slug, gate_min, ltv_bps, default_apy_bps, term_seconds"],
  ["post_offer", "lender deposits USDC into offer vault PDA"],
  ["cancel_offer", "vault → lender"],
  ["list_project", "mints Token-2022 Project Note to AV, stores specs + cached takeout"],
  ["accept_offer", "collection match · gate ≥ min · principal ≤ lendable · freeze note · USDC → borrower (− origination → treasury)"],
  ["admin_set_gate", "oracle writes G0–G6"],
  ["record_takeout_payment", "anyone posts USDC into loan escrow tagged rebate | rec (implies G5 / G6)"],
  ["repay", "waterfall: escrow + wallet → principal → interest (−10%) → residual; thaw note; G7"],
  ["extend", "once, +30d at apy + 600 bps, before grace ends"],
  ["foreclose", "after expiry + 72h: note → lender, escrow → lender"],
  ["claim_fees", "treasury sweep"],
] as const;

function Docs() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <SectionHead eyebrow="Docs" title="Protocol in one page" />

      <div className="prose-helio space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="font-display text-xl text-foreground">What HELIO is</h2>
          <p>A Sharky-style fixed-term lending market where the collateral is not a JPEG floor but a <span className="text-foreground">contracted takeout</span>: the Ameren Illinois smart-inverter rebate plus the first Illinois Shines REC payment owed to an Approved Vendor (AV) once a project energizes. Lenders post USDC on a collection; AVs list a Project Note and accept an offer; the utility and the ABP repay the loan through an on-chain escrow waterfall.</p>
          <p>No oracle price feed. No mid-loan liquidation. The only clock is the term: unpaid at expiry + 72h grace, the lender forecloses on the <em>claim</em>, not the panels.</p>
        </section>

        <section>
          <h2 className="font-display text-xl text-foreground">Takeout formula</h2>
          <pre className="overflow-x-auto rounded-sm border border-border bg-surface p-3 font-mono text-xs text-foreground">{`year1_recs  = floor1(kW_ac × 0.1642 × 8.760)
total_recs  = floor(Σ_{t=0..14} year1_recs × 0.995^t)
rec_price   = tier(kW_ac) + 20·customer_owned(≤25 kW) + 5·eec
rec_amount  = total_recs × rec_price
first_rec   = rec_amount × (kW_ac ≤ 25 ? 0.50 : 0.15)
gross       = 300·kW_dc + 300·kWh_batt(paired) + first_rec − 0.05·rec_amount
takeout     = gross × 0.97            // 3% protocol haircut reserve
lendable    = takeout × min(collection_ltv, gate_ltv)
interest    = principal × apy_bps × elapsed_s / (10_000 × 365 × 86 400)   // u64 µUSDC`}</pre>
        </section>

        <section>
          <h2 className="font-display text-xl text-foreground">Group A DG REC prices · 2026–27</h2>
          <table className="w-full text-xs">
            <tbody>
              {GROUP_A_DG_REC_PRICES.map((r) => (
                <tr key={r.label} className="border-b border-border/60"><td className="py-1.5 text-foreground">{r.label}</td><td className="num text-right">${r.price.toFixed(2)}</td></tr>
              ))}
              <tr className="border-b border-border/60"><td className="py-1.5">Customer-owned Small DG adder (no federal ITC)</td><td className="num text-right">+$20.00</td></tr>
              <tr className="border-b border-border/60"><td className="py-1.5">Equity Eligible Contractor adder</td><td className="num text-right">+$5.00</td></tr>
              <tr><td className="py-1.5 text-foreground">Effective 0–10 kW customer-owned EEC</td><td className="num text-right text-volt">$95.37</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="font-display text-xl text-foreground">Gates</h2>
          <ul className="space-y-1">
            {GATES.map((g) => (<li key={g.id}><span className="font-mono text-volt">{g.code}</span> {g.title}{g.id >= 2 && g.id <= 4 ? <span className="ml-2 rounded-sm border border-border px-1 text-[10px]">originatable</span> : null}</li>))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl text-foreground">Default offer grid</h2>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted-foreground"><th className="py-1 font-normal">Gate</th><th className="font-normal">Term</th><th className="font-normal">APY</th><th className="font-normal">Orig.</th><th className="font-normal">LTV</th></tr></thead>
            <tbody className="num">{OFFER_GRID.map((g) => (<tr key={g.gate} className="border-t border-border/60"><td className="py-1.5 font-sans text-foreground">{g.gateLabel}</td><td>{g.termDays}d</td><td>{g.apyBps / 100}%</td><td>{g.originationBps / 100}%</td><td>{g.ltvBps / 100}%</td></tr>))}</tbody>
          </table>
          <p className="mt-2">Protocol fee 10% of interest; origination to treasury. One 30-day extension at +6% APY, then foreclose.</p>
        </section>

        <section>
          <h2 className="font-display text-xl text-foreground">Program instructions (Anchor · programs/helio)</h2>
          <table className="w-full text-xs">
            <tbody>{IX.map(([n, d]) => (<tr key={n} className="border-b border-border/60 align-top"><td className="py-1.5 pr-3 font-mono text-volt">{n}</td><td className="py-1.5">{d}</td></tr>))}</tbody>
          </table>
          <p className="mt-2">Accounts: Config, Collection, Offer (+ vault), Project (+ Token-2022 note mint with program freeze authority), Loan (+ escrow). Composability: plain USDC SPL, Token-2022 freeze/permanent-delegate for the note — any wallet or marketplace can read a frozen note as “encumbered”.</p>
        </section>

        <section>
          <h2 className="font-display text-xl text-foreground">Demo keypairs (devnet only)</h2>
          <table className="w-full font-mono text-[11px]">
            <tbody>
              {Object.entries(DEMO).map(([k, v]) => (<tr key={k} className="border-b border-border/60"><td className="py-1 pr-3 text-foreground">{k}</td><td className="break-all">{v}</td></tr>))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="font-display text-xl text-foreground">Illinois sources</h2>
          <ul className="space-y-2">
            {SOURCES.map((s) => (<li key={s.title}><span className="text-foreground">{s.title}</span> — {s.note}</li>))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl text-foreground">Not in v1</h2>
          <p>General-purpose money market · token emissions · IPA portal scraping · homeowner consumer loans · 15-year REC streaming as the loan (tail stays with the AV) · multi-chain · mobile-native · admin DAO.</p>
        </section>
      </div>
    </div>
  );
}
