import { createFileRoute } from "@tanstack/react-router";
import { Flame, Zap } from "lucide-react";
import { useState } from "react";
import { SectionHead, Stat, usd, usdc } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PANEL_PACKS, PANEL_PRICE_USDC, PANEL_WATTS_DC } from "@/lib/helio/constants";
import { useHelio } from "@/lib/helio/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Panel shop — HELIO" },
      { name: "description", content: "Mint Helio 400 W panels at $400 USDC each. Panels are the underwriting unit for Illinois solar jobs." },
      { property: "og:title", content: "Panel shop — HELIO" },
      { property: "og:description", content: "Mint Helio 400 W panels at $400 USDC each." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { state, wallet, balance, panels, buyPanels, ready } = useHelio();
  const [qty, setQty] = useState(1);
  const cost = qty * PANEL_PRICE_USDC;

  return (
    <div className="space-y-10">
      <SectionHead
        eyebrow="Panel mint"
        title="Helio 400 W panel"
        right={
          <div className="flex gap-6">
            <Stat label="In stock" value={ready ? state.shopStock : "—"} sub="of 500 minted this cycle" />
            <Stat label="You hold" value={ready ? panels : "—"} sub="unbonded panels" accent />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="panel space-y-5 p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-sm bg-volt text-volt-foreground">
              <Zap className="size-5" strokeWidth={2.5} />
            </span>
            <div>
              <div className="text-lg font-medium">{PANEL_WATTS_DC} W DC · ${PANEL_PRICE_USDC} USDC</div>
              <div className="text-xs text-muted-foreground">Token-2022 panel · burnable into any open HELIO job</div>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>· One panel funds {PANEL_WATTS_DC} W of a real Ameren Illinois roof at $1.00/W-DC.</li>
            <li>· Panels are fungible until you burn them. Burning is permanent and mints a Project Share.</li>
            <li>· Shares receive the Ameren rebate, the 50% first Illinois Shines REC payment, and 80% of the 6-year REC tail.</li>
          </ul>
          <div className="rounded-sm bg-surface p-3 text-[11px] leading-relaxed text-muted-foreground">
            Panel price is a funding unit, not a yield promise. Every job on HELIO publishes its own takeout with the Illinois Shines price tier,
            adder flags and Ameren rebate basis shown on the card.
          </div>
        </div>

        <div className="panel space-y-5 p-6">
          <div className="eyebrow">Choose a pack</div>
          <div className="grid grid-cols-3 gap-3">
            {PANEL_PACKS.map((n) => (
              <button
                key={n}
                onClick={() => setQty(n)}
                className={cn(
                  "rounded-sm border p-4 text-left transition-colors",
                  qty === n ? "border-volt bg-volt/10" : "border-border bg-surface hover:border-volt/40",
                )}
              >
                <div className="num text-2xl font-medium">{n}</div>
                <div className="text-xs text-muted-foreground">panel{n > 1 ? "s" : ""}</div>
                <div className="num mt-2 text-sm">{usd(n * PANEL_PRICE_USDC)}</div>
                <div className="text-[10px] text-muted-foreground">{((n * PANEL_WATTS_DC) / 1000).toFixed(1)} kW-DC</div>
              </button>
            ))}
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="eyebrow" htmlFor="qty">
                Custom quantity
              </label>
              <Input
                id="qty"
                type="number"
                min={1}
                max={state.shopStock}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                className="num"
              />
            </div>
            <div className="text-right">
              <div className="eyebrow">Total</div>
              <div className="num text-2xl font-medium text-volt">{usd(cost)}</div>
            </div>
          </div>

          <Button variant="volt" size="lg" className="w-full" disabled={!wallet || qty > state.shopStock} onClick={() => buyPanels(qty)}>
            <Flame className="size-4" />
            {wallet ? `Mint ${qty} panel${qty > 1 ? "s" : ""}` : "Connect a wallet to mint"}
          </Button>
          <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
            <span>Wallet {wallet ? usdc(balance, 0) : "not connected"}</span>
            <span>{state.shopStock} panels remaining</span>
          </div>
        </div>
      </div>
    </div>
  );
}
