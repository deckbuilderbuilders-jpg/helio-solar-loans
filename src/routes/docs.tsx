import { createFileRoute } from "@tanstack/react-router";
import { SectionHead } from "@/components/helio/ui";
import { GATES } from "@/lib/helio/constants";
import { POINTS_END, POINTS_START } from "@/lib/helio/auction";
import { APPLICATION_FEE_PER_KW, APR_MAX, APR_MIN, COVERAGE_FULL, COVERAGE_MIN, CREATOR_TOTAL_MULTIPLE, FACTOR_ADVANCE, projectEconomics } from "@/lib/helio/economics";
import { DG_REC_PRICES } from "@/lib/helio/rec";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Protocol docs — HELIO" },
      { name: "description", content: "How HELIO prices bridge notes from Illinois Shines REC value, factors the REC tail, and repays lenders in 90–120 days — with every source." },
      { property: "og:title", content: "Protocol docs — HELIO" },
      { property: "og:description", content: "REC engine, APR function, factoring, points and the takeout waterfall." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Docs,
});

function Docs() {
  const ex = projectEconomics(10);
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div className="space-y-3">
        <div className="hazard h-1.5 w-24" />
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Protocol</h1>
        <p className="text-muted-foreground">
          HELIO runs fixed-term USDC bridge notes on Illinois solar + storage roofs. Lenders fund the build at {APR_MIN * 100}–{APR_MAX * 100}% APR. In 90–120
          days the Ameren rebates, the first Illinois Shines REC payment and the sale of the remaining REC contract repay them in one payment. The
          customer signs a PPA, owns the equipment, and pays about half their old bill; those payments go to HELIO for maintenance.
        </p>
      </div>

      <Block title="Creating a note">
        <p>
          Every input that sets the REC value is on the Illinois Shines application. The creator uploads it; HELIO reads the size, capacity factor,
          utility group, adders and Part I / Part II quantities, the creator checks them, and the note is recorded with a SHA-256 fingerprint of the file.
          The ${APPLICATION_FEE_PER_KW}/kW application fee is the only money at risk: if the note never fills, it's lost and lenders are refunded in full. If
          it fills, the creator gets {CREATOR_TOTAL_MULTIPLE}x the fee in cash at takeout.
        </p>
      </Block>

      <Block title="REC engine">
        <pre className="overflow-x-auto rounded-sm bg-surface p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
{`year-1 MWh = kW-AC × CF × 8,760 / 1,000
quantity   = floor(Σ 15 yrs, −0.5%/yr)  or lesser of Part I / Part II
$/REC      = 2026–27 DG table (Group A/B, AC size bin) + adders
contract   = quantity × $/REC
first pay  = 50% Small DG (≤25 kW AC) / 15% Large DG, at energization
collateral = 5% of contract, held by the program`}
        </pre>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 font-normal">DG tier (AC)</th>
              <th className="py-2 text-right font-normal">Group A $/REC</th>
              <th className="py-2 text-right font-normal">Group B $/REC</th>
            </tr>
          </thead>
          <tbody>
            {DG_REC_PRICES.map((t) => (
              <tr key={t.label} className="border-b border-border/60">
                <td className="py-1.5">{t.label}</td>
                <td className="num py-1.5 text-right">${t.A.toFixed(2)}</td>
                <td className="num py-1.5 text-right">${t.B.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>Adders: customer-owned Small DG +$20/REC (no federal credit), Equity Eligible Contractor +$5/REC. Group A = Ameren / MISO; Group B = ComEd / PJM.</p>
      </Block>

      <Block title="Factoring the REC tail">
        <p>
          The Ameren rebates are fixed ($300/kW-DC and $300/kWh storage). The REC contract depends on production. At energization HELIO sells the
          remaining REC contract for {FACTOR_ADVANCE * 100}% of face, so every dollar lands in one window. On a default 10 kW / 64 kWh Ameren roof: build{" "}
          ${Math.round(ex.buildCost).toLocaleString()}, cash ${Math.round(ex.totalCash).toLocaleString()} ({ex.coverage.toFixed(2)}x).
        </p>
      </Block>

      <Block title="APR from coverage">
        <p>
          Coverage = (rebates + first REC − collateral + factored tail) ÷ build. The thinner the cushion, the riskier the loan and the higher the rate:{" "}
          {APR_MAX * 100}% at {COVERAGE_MIN.toFixed(2)}x, falling linearly to {APR_MIN * 100}% at {COVERAGE_FULL.toFixed(2)}x and above. Below{" "}
          {COVERAGE_MIN.toFixed(2)}x a roof can't be listed — that floor keeps lenders whole at 24% for the full 120 days with the creator's cash still
          covered. The APR is fixed at creation; every lender in the note earns it, from the day their deposit lands.
        </p>
      </Block>

      <Block title="WATTS points">
        <p>
          Early lenders earn more points: {POINTS_START}x per dollar when the note is empty, falling linearly to {POINTS_END}x when it's full. Points carry
          no cash value in this version. Before a note fills, lenders can withdraw for a 2.5% fee (1.5% to lenders who stay, 1.0% to the protocol) and
          give up points in proportion.
        </p>
        <p className="mt-2">
          WATTS run in 90-day seasons with a fixed emission (Season 0: 100M). Pools: 55% completion (notes that repay), 20% capital (USDC × days × fill ×
          hold), 15% origination, 7% installer, 3% referral. Exiting before fill earns 0.25x; holding to repayment 1x; rolling within 14 days 1.15x. See the
          WATTS page for live pool totals.
        </p>
      </Block>

      <Block title="Payout order at takeout">
        <p>
          Lenders principal + interest → creator {CREATOR_TOTAL_MULTIPLE}x cash → installer 7% of the factored proceeds → HELIO. Installers also earn
          $0.33/W at build plus $0.02/W for a one-day install. The 5% REC collateral is released to HELIO later.
        </p>
      </Block>

      <Block title="Stages">
        <ol className="space-y-1.5">
          {GATES.map((g) => (
            <li key={g.id} className="flex gap-3">
              <span className="num shrink-0 font-mono text-xs text-volt">{g.code}</span>
              <span>{g.title}</span>
            </li>
          ))}
        </ol>
      </Block>

      <Block title="Sources">
        <ul className="space-y-1.5">
          <li>· Illinois Shines / Adjustable Block Program 2026–27 Program Guidebook and Final 2026–27 REC Prices.</li>
          <li>· 2026 REC Delivery Contract — Small DG 50% at energization, Large DG 15%, remainder ratably over 6 years; 5% collateral.</li>
          <li>· Ameren Illinois DG rebate tariff — $300/kW-DC, $300/kWh paired storage, ~60 days after PTO.</li>
          <li>· Factoring advance (65% of face) is HELIO's working assumption, not a quoted rate.</li>
        </ul>
      </Block>

      <Block title="Exclusions">
        <ul className="space-y-1.5">
          <li>· Taking the Ameren rebate moves the customer to supply + transmission-only net metering; storage is what gets the bill to 50%.</li>
          <li>· Devnet demonstration figures. Nothing here is an offer of securities or a guarantee of program payments.</li>
        </ul>
      </Block>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <SectionHead title={title} />
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_li]:text-sm">{children}</div>
    </section>
  );
}
