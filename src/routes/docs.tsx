import { createFileRoute } from "@tanstack/react-router";
import { SectionHead } from "@/components/helio/ui";
import {
  AMEREN_BATTERY_REBATE_PER_KWH,
  AMEREN_SOLAR_REBATE_PER_KW_DC,
  CAPACITY_FACTOR,
  GATES,
  GROUP_A_DG_REC_PRICES,
} from "@/lib/helio/constants";
import { APR_CAP, APR_FLOOR, AUCTION_HOURS } from "@/lib/helio/auction";
import { APPLICATION_FEE_PER_KW, CREATOR_CASH_MULTIPLE, CREATOR_YIELD_MULTIPLE, TAIL_PROTOCOL_FEE, TAIL_TO_HELIO, TAIL_TO_INSTALLER, TAIL_TO_YIELD } from "@/lib/helio/economics";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Protocol docs — HELIO" },
      { name: "description", content: "How HELIO bridge notes, the APR auction, takeout and Yield NFTs work, plus the Illinois Shines 2026–27 and Ameren rebate sources behind every number." },
      { property: "og:title", content: "Protocol docs — HELIO" },
      { property: "og:description", content: "Bridge notes, auction, takeout and Yield NFTs." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Docs,
});

function Docs() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div className="space-y-3">
        <div className="hazard h-1.5 w-24" />
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Protocol</h1>
        <p className="text-muted-foreground">
          HELIO runs fixed-term USDC bridge notes on Illinois solar + storage roofs. Lenders fund the build; Ameren rebates and the first Illinois Shines REC
          payment repay them in 90–120 days. The customer signs a PPA, owns the equipment, and pays about half their old bill.
        </p>
      </div>

      <Block title="Creating a roof">
        <p>
          Anyone can open a note by paying the ${APPLICATION_FEE_PER_KW}/kW Illinois Shines application fee. It is the only money at risk: if the auction never
          fills, the fee is lost and lenders are refunded in full. If it fills, the creator gets {CREATOR_CASH_MULTIPLE}x the fee in cash at takeout and a
          Yield NFT weighted at {CREATOR_YIELD_MULTIPLE}x the fee.
        </p>
      </Block>

      <Block title="Reverse Dutch auction">
        <p>
          APR opens at {APR_FLOOR * 100}% and climbs linearly to a {APR_CAP * 100}% cap over {AUCTION_HOURS} hours. The dollar that fills the note sets the
          clearing APR for every lender. Before it fills, lenders can withdraw for a 2.5% fee: 1.5% to lenders who stay, 1.0% to the protocol.
        </p>
      </Block>

      <Block title="Build and takeout">
        <pre className="overflow-x-auto rounded-sm bg-surface p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
{`note     = kW_dc × $1.15/W  +  kWh × ($225 + $25)
takeout  = kW_dc × $300  +  kWh × $300  +  first 50% REC ($0.845/W)
waterfall: lenders principal + interest → creator 3x cash → HELIO`}
        </pre>
        <p>Installers earn $0.33/W at build, plus $0.02/W when the install is finished in one day.</p>
      </Block>

      <Block title="Yield NFTs and the tail">
        <p>
          When a note fills, each lender gets a Yield NFT weighted by principal × an early-funder multiplier: 1.8x at auction open, falling linearly to 1x as APR climbs to the cap. Early money earns more tail; late money earns a higher locked APR. The remaining 50% REC contract (24 quarters) splits{" "}
          {TAIL_TO_YIELD * 100}% to Yield NFTs and a {TAIL_PROTOCOL_FEE * 100}% protocol fee, of which 20% goes to the installer
          ({(TAIL_TO_INSTALLER * 100).toFixed(0)}% of tail) and {(TAIL_TO_HELIO * 100).toFixed(0)}% to HELIO. Yield NFTs trade on the market; unclaimed cash
          moves with the NFT.
        </p>
      </Block>

      <Block title="REC engine">
        <p>
          Nameplate is kW AC. Year-1 RECs = kW AC × {(CAPACITY_FACTOR * 100).toFixed(2)}% capacity factor × 8,760 h ÷ 1,000. The 15-year total sums
          year-1 output degraded 0.5% annually and is rounded down to whole RECs. REC Purchase Amount = total RECs × effective price. Small DG (≤25 kW AC)
          receives 50% at Energization/Part II; Large DG receives 15%.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 font-normal">Group A DG tier</th>
              <th className="py-2 text-right font-normal">$/REC</th>
            </tr>
          </thead>
          <tbody>
            {GROUP_A_DG_REC_PRICES.map((t) => (
              <tr key={t.label} className="border-b border-border/60">
                <td className="py-1.5">{t.label}</td>
                <td className="num py-1.5 text-right">${t.price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Stacked adders: customer-owned Small DG +$20/REC (no federal ITC), Equity Eligible Contractor +$5/REC. A 0–10 kW customer-owned EEC job prices
          at $95.37/REC.
        </p>
      </Block>

      <Block title="Ameren rebates">
        <p>
          ${AMEREN_SOLAR_REBATE_PER_KW_DC}/kW-DC on DS-1 and DS-2 generation, plus ${AMEREN_BATTERY_REBATE_PER_KWH}/kWh for storage only when paired with
          qualifying solar. Rebates arrive roughly 60 days after Permission to Operate. Electing the generation rebate moves the site to supply +
          transmission-only net metering — HELIO never models bill savings at full retail.
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
          <li>· Illinois Shines / Adjustable Block Program 2026–27 Program Guidebook — Group A Distributed Generation REC price tables and adders.</li>
          <li>· Illinois Shines 2026–27 REC contract terms — 15-year delivery, 50% Small DG / 15% Large DG first payment, remainder over 24 quarters.</li>
          <li>· Ameren Illinois distributed generation rebate tariff — $300/kW-DC (DS-1, DS-2), $300/kWh paired storage, ~60-day payment after PTO.</li>
          <li>· Ameren Illinois net metering provisions for rebate-electing customers — supply + transmission-only credit.</li>
        </ul>
      </Block>

      <Block title="Exclusions">
        <ul className="space-y-1.5">
          <li>· No mid-project liquidations and no price oracles — takeout is a tariffed rebate plus a utility REC invoice.</li>
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
