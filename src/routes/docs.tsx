import { createFileRoute } from "@tanstack/react-router";
import { SectionHead } from "@/components/helio/ui";
import {
  AMEREN_BATTERY_REBATE_PER_KWH,
  AMEREN_SOLAR_REBATE_PER_KW_DC,
  CAPACITY_FACTOR,
  GATES,
  GROUP_A_DG_REC_PRICES,
  ORIGINATOR_TAIL_BPS,
  PANEL_PRICE_USDC,
  PANEL_WATTS_DC,
} from "@/lib/helio/constants";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Protocol docs — HELIO" },
      { name: "description", content: "How HELIO panels, Project Shares and takeout work, plus the Illinois Shines 2026–27 and Ameren rebate sources behind every number." },
      { property: "og:title", content: "Protocol docs — HELIO" },
      { property: "og:description", content: "Panels, Project Shares, takeout math and Illinois sources." },
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
          HELIO is an originator, not a lender. We underwrite Ameren Illinois solar jobs, publish them at a funding target of $1.00 per watt-DC, and let
          panel holders fund the roof they choose.
        </p>
      </div>

      <Block title="Panels">
        <p>
          One Helio Panel represents {PANEL_WATTS_DC} W DC of underwriting capacity and mints for ${PANEL_PRICE_USDC} USDC. Panels are fungible and
          transferable until they are bonded.
        </p>
      </Block>

      <Block title="Bonding and Project Shares">
        <p>
          Burning panels into a project is permanent. A wallet's Project Share equals panels burned ÷ panels required, where panels required = ceil(kW-DC ×
          1000 ÷ {PANEL_WATTS_DC}). When bonded panels reach the requirement, the job is Funded and construction proceeds.
        </p>
      </Block>

      <Block title="Takeout">
        <p>Takeout is the contracted cash a funded job returns to shares:</p>
        <pre className="overflow-x-auto rounded-sm bg-surface p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
{`takeout = ameren_solar_rebate
        + ameren_battery_rebate
        + first_rec_payment
        − 5% rec_contract_collateral
        − 3% protocol_haircut_reserve`}
        </pre>
        <p>
          The remaining 6-year REC tail pays over 24 quarters and splits {100 - ORIGINATOR_TAIL_BPS / 100}% to Project Shares and{" "}
          {ORIGINATOR_TAIL_BPS / 100}% to HELIO as the originator fee.
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

      <Block title="Milestones">
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
          <li>· Panels are a funding unit, not a yield instrument; the REC tail is disclosed but paid over six years.</li>
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
