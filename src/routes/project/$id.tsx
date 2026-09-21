import { Link, createFileRoute } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { useState } from "react";
import { BasisLine } from "@/components/helio/Basis";
import { GateTimeline } from "@/components/helio/GateTimeline";
import { SourcesPopover } from "@/components/helio/Sources";
import { Empty, GateChip, Pill, Progress, Row, SectionHead, Stat, dateShort, pct, usd, usdc } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ORIGINATOR_TAIL_BPS, PANEL_PRICE_USDC } from "@/lib/helio/constants";
import { bondedPanels, claimable, distributedToShares, holders, projectStatus, short } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";

export const Route = createFileRoute("/project/$id")({
  head: () => ({
    meta: [
      { title: "Project underwriting — HELIO" },
      { name: "description", content: "Full underwriting for a HELIO-originated Ameren Illinois solar job: funding target, panels bonded, milestones, holders and USDC payouts." },
      { property: "og:title", content: "Project underwriting — HELIO" },
      { property: "og:description", content: "Underwriting, milestones and payouts for an Ameren Illinois solar job." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const { state, wallet, panels, bondPanels, claim } = useHelio();
  const p = state.projects.find((x) => x.id === id);
  const [bond, setBond] = useState(1);

  if (!p) {
    return (
      <Empty
        title="Project not found"
        body="This job is not in the current demo ledger. Reset the demo from the header menu or pick another project."
        cta={
          <Button asChild variant="secondary">
            <Link to="/projects">All projects</Link>
          </Button>
        }
      />
    );
  }

  const t = p.takeout;
  const status = projectStatus(p);
  const raised = p.panelsBonded * PANEL_PRICE_USDC;
  const room = p.panelsRequired - p.panelsBonded;
  const mine = wallet ? bondedPanels(state, p.id, wallet) : 0;
  const myClaim = wallet ? claimable(state, p, wallet) : 0;
  const paid = distributedToShares(p);
  const tailToShares = (t.recTail * (10_000 - ORIGINATOR_TAIL_BPS)) / 10_000;
  const list = holders(state, p);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="eyebrow">
            {p.city} · Ameren Illinois {p.rateClass} · Illinois Shines Group A {t.tierLabel} {t.isSmallDg ? "Small DG" : "Large DG"}
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{p.name}</h1>
          <div className="flex items-center gap-2">
            <GateChip gate={p.gate} />
            <Pill state={status} />
            <span className="font-mono text-[11px] text-muted-foreground">{p.address}</span>
          </div>
        </div>
        <div className="flex items-end gap-6">
          <Stat label="Funding target" value={usd(p.fundingTarget)} sub={`${p.panelsRequired} panels × $${PANEL_PRICE_USDC}`} />
          <Stat label="Takeout" value={usd(t.takeout)} sub={paid > 0 ? `${usd(paid)} distributed` : "contracted"} accent />
          <SourcesPopover />
        </div>
      </div>

      <div className="panel space-y-3 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Bonding progress</div>
            <div className="num mt-1 text-2xl font-medium">
              {p.panelsBonded}
              <span className="text-muted-foreground">/{p.panelsRequired}</span> <span className="text-sm text-muted-foreground">panels burned</span>
            </div>
          </div>
          <div className="flex items-end gap-6">
            <Stat label="Raised" value={usd(raised)} sub={`${usd(p.fundingTarget - raised)} remaining`} />
            <Stat label="Your share" value={pct(p.panelsRequired ? mine / p.panelsRequired : 0, 2)} sub={`${mine} panel${mine === 1 ? "" : "s"} bonded`} />
            <BondDialog
              disabled={!wallet || room <= 0}
              projectName={p.name}
              room={room}
              held={panels}
              value={bond}
              onValue={setBond}
              onConfirm={() => bondPanels(p.id, bond)}
              perPanel={t.takeout / p.panelsRequired}
            />
          </div>
        </div>
        <Progress value={p.panelsBonded} total={p.panelsRequired} />
        <BasisLine t={t} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="panel p-5">
          <SectionHead eyebrow="Underwriting" title="Takeout build-up" />
          <div className="mb-4 grid grid-cols-3 gap-3">
            <Stat label="System" value={`${p.specs.kwAc} kW AC`} sub={`${p.specs.kwDc} kW-DC${p.specs.batteryKwh ? ` · ${p.specs.batteryKwh} kWh` : ""}`} />
            <Stat label="Install cost" value={usd(t.installCost)} sub="$1.00/W-DC" />
            <Stat label="Takeout / panel" value={usd(t.takeout / p.panelsRequired)} sub={`+ ${usd(tailToShares / p.panelsRequired)} tail`} accent />
          </div>
          <div className="divide-y divide-border/60 text-sm">
            <Row label="Ameren solar rebate" sub={`${p.specs.kwDc} kW-DC × $300`} value={usd(t.amerenSolarRebate)} />
            {t.amerenBatteryRebate > 0 && <Row label="Ameren battery rebate" sub={`${p.specs.batteryKwh} kWh × $300`} value={usd(t.amerenBatteryRebate)} />}
            <Row
              label={`First REC payment (${Math.round(t.firstPaymentPct * 100)}%)`}
              sub={`${t.totalRecs} RECs × $${t.effectivePrice.toFixed(2)} = ${usd(t.recPurchaseAmount)}`}
              value={usd(t.firstRecPayment)}
            />
            <Row label="REC-contract collateral lock (5%)" value={`−${usd(t.recCollateralLock)}`} muted />
            <Row label="Protocol haircut reserve (3%)" value={`−${usd(t.protocolReserve)}`} muted />
            <Row label="Takeout to Project Shares" value={usd(t.takeout)} strong />
          </div>
          <div className="mt-4 divide-y divide-border/60 text-sm">
            <Row label="6-year REC tail (24 quarters)" value={usd(t.recTail)} muted />
            <Row label="80% of tail to Project Shares" value={usd(tailToShares)} />
            <Row label="20% originator fee to HELIO" value={usd(t.recTail - tailToShares)} muted />
          </div>
          <p className="mt-4 rounded-sm bg-surface p-3 text-[11px] leading-relaxed text-muted-foreground">
            Electing the Ameren generation rebate switches this site to supply + transmission-only net metering. Bill savings are not modelled at full
            retail anywhere in this underwrite. Energization deadline {dateShort(p.energizationDeadline)} (18 months from ICC Trade Date{" "}
            {dateShort(p.tradeDate)}).
          </p>
        </div>

        <div className="space-y-6">
          <div className="panel p-5">
            <SectionHead eyebrow="Milestones" title="Gate progress" />
            <GateTimeline gate={p.gate} />
          </div>

          <div className="panel p-5">
            <SectionHead
              eyebrow="Your position"
              title="Claims"
              right={
                <Button variant="volt" size="sm" disabled={!wallet || myClaim <= 0.000001} onClick={() => claim(p.id)}>
                  Claim {usd(myClaim)}
                </Button>
              }
            />
            <div className="divide-y divide-border/60 text-sm">
              <Row label="Panels bonded" value={mine} />
              <Row label="Project Share" value={pct(p.panelsRequired ? mine / p.panelsRequired : 0, 2)} />
              <Row label="Distributed to shares" value={usd(paid)} muted />
              <Row label="Claimed by you" value={usd(wallet ? (p.claims[wallet] ?? 0) : 0)} muted />
              <Row label="Claimable now" value={usd(myClaim)} strong />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <SectionHead eyebrow="Payouts" title="USDC received" />
          {p.payouts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No takeout received yet. Payments land after PTO and Part II.</p>
          ) : (
            <div className="divide-y divide-border/60 text-sm">
              {p.payouts.map((x) => (
                <Row
                  key={x.id}
                  label={x.kind === "rebate" ? "Ameren rebate" : x.kind === "rec" ? "First REC payment" : "REC tail quarter"}
                  sub={`${dateShort(x.at)} · ${x.memo}`}
                  value={usdc(x.toShares, 0)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="panel p-5">
          <SectionHead eyebrow="Holders" title={`${list.length} share holder${list.length === 1 ? "" : "s"}`} />
          {list.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No panels burned into this job yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 font-normal">Wallet</th>
                  <th className="py-2 font-normal">Panels</th>
                  <th className="py-2 font-normal">Share</th>
                  <th className="py-2 text-right font-normal">Claimed</th>
                </tr>
              </thead>
              <tbody>
                {list.map((h) => (
                  <tr key={h.holder} className="border-b border-border/60">
                    <td className="py-2 font-mono text-xs text-muted-foreground">{short(h.holder)}</td>
                    <td className="num py-2">{h.panels}</td>
                    <td className="num py-2 text-volt">{pct(h.pct, 2)}</td>
                    <td className="num py-2 text-right">{usd(h.claimed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function BondDialog({
  disabled,
  projectName,
  room,
  held,
  value,
  onValue,
  onConfirm,
  perPanel,
}: {
  disabled: boolean;
  projectName: string;
  room: number;
  held: number;
  value: number;
  onValue: (n: number) => void;
  onConfirm: () => void;
  perPanel: number;
}) {
  const [open, setOpen] = useState(false);
  const max = Math.min(room, held);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="volt" disabled={disabled}>
          <Flame className="size-4" />
          {room <= 0 ? "Fully bonded" : "Burn panels in"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Burn panels into {projectName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Burning is permanent. Each panel converts to a {(100 / (room + (max || 1))).toFixed(2)}%-scale slice of this job's takeout — your Project
            Share equals panels burned ÷ panels required.
          </p>
          <div className="space-y-1.5">
            <label className="eyebrow" htmlFor="bond">
              Panels to burn
            </label>
            <Input id="bond" type="number" min={1} max={max} value={value} onChange={(e) => onValue(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="num" />
            <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
              <span>You hold {held} unbonded</span>
              <span>{room} panels still needed</span>
            </div>
          </div>
          <div className="divide-y divide-border/60 rounded-sm bg-surface p-3 text-sm">
            <Row label="Capital committed" value={usd(value * PANEL_PRICE_USDC)} />
            <Row label="Takeout attributable" value={usd(value * perPanel)} strong />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="volt"
            disabled={max <= 0 || value > max}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Burn {value} panel{value > 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
