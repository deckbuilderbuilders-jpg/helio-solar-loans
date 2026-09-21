import { Link, createFileRoute } from "@tanstack/react-router";
import { Empty, GateChip, Pill, Progress, SectionHead, Stat, dateShort, usd, usdc } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { GATES } from "@/lib/helio/constants";
import { distributedToShares, projectStatus, short } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";
import type { Gate, HelioProject } from "@/lib/helio/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/oracle")({
  head: () => ({
    meta: [
      { title: "Oracle console — HELIO" },
      { name: "description", content: "Admin console to advance Illinois Shines and Ameren milestones and inject rebate, first REC and REC tail USDC into HELIO projects." },
      { property: "og:title", content: "Oracle console — HELIO" },
      { property: "og:description", content: "Advance milestones and inject takeout USDC for the demo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Oracle,
});

function Oracle() {
  const { state, role, connect, setGate, recordPayment } = useHelio();

  if (role !== "admin") {
    return (
      <Empty
        title="Oracle console is admin-only"
        body="The oracle writes milestones and injects mock Ameren and Illinois Shines payments so the demo never depends on Illinois servers."
        cta={
          <Button variant="volt" onClick={() => connect("admin")}>
            Load originator admin wallet
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <SectionHead
        eyebrow="Admin"
        title="Oracle console"
        right={
          <div className="flex gap-6">
            <Stat label="Jobs" value={state.projects.length} sub="originated" />
            <Stat label="Panels burned" value={state.panelsBurned} sub={`${state.panelsMinted} minted`} />
            <Stat label="Originator fees" value={usd(state.projects.reduce((s, p) => s + p.originatorEarned, 0))} sub="20% of REC tail" accent />
          </div>
        }
      />

      <div className="space-y-4">
        {state.projects.map((p) => (
          <OracleRow key={p.id} p={p} onGate={(g) => setGate(p.id, g)} onPay={(kind, amount, memo) => recordPayment(p.id, kind, amount, memo)} />
        ))}
      </div>

      <div className="panel p-5">
        <SectionHead eyebrow="Instruction log" title="Recent transactions" />
        <div className="max-h-80 divide-y divide-border/60 overflow-y-auto text-sm">
          {state.log.map((e) => (
            <div key={e.id} className="flex items-baseline gap-3 py-2">
              <span className="num shrink-0 text-[11px] text-muted-foreground">{dateShort(e.at)}</span>
              <span className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] text-volt">{e.ix}</span>
              <span className="min-w-0 flex-1 text-xs text-muted-foreground">{e.detail}</span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{short(e.signer)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OracleRow({
  p,
  onGate,
  onPay,
}: {
  p: HelioProject;
  onGate: (g: Gate) => void;
  onPay: (kind: "rebate" | "rec" | "tail", amount: number, memo: string) => void;
}) {
  const t = p.takeout;
  const funded = p.panelsBonded >= p.panelsRequired;
  const rebate = t.amerenSolarRebate + t.amerenBatteryRebate;
  const recNet = Math.max(0, t.takeout - rebate);
  const tailQuarter = t.recTail / 24;
  const paidKinds = new Set(p.payouts.map((x) => x.kind));

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <GateChip gate={p.gate} />
            <Pill state={projectStatus(p)} />
          </div>
          <Link to="/project/$id" params={{ id: p.id }} className="block truncate font-medium hover:text-volt">
            {p.name}
          </Link>
          <div className="font-mono text-[11px] text-muted-foreground">
            {p.city} · {p.specs.kwAc} kW AC / {p.specs.kwDc} kW-DC · {p.panelsBonded}/{p.panelsRequired} bonded
          </div>
          <Progress value={p.panelsBonded} total={p.panelsRequired} className="max-w-xs" />
        </div>
        <div className="flex gap-6">
          <Stat label="Takeout" value={usd(t.takeout)} sub={`${usd(distributedToShares(p))} distributed`} />
          <Stat label="Tail quarter" value={usdc(tailQuarter, 0)} sub="24 quarters" />
        </div>
      </div>

      <div>
        <div className="eyebrow mb-2">Advance milestone</div>
        <div className="flex flex-wrap gap-1">
          {GATES.map((g) => (
            <button
              key={g.id}
              title={g.title}
              disabled={g.id === p.gate}
              onClick={() => onGate(g.id as Gate)}
              className={cn(
                "rounded-sm border px-2 py-1 font-mono text-[11px] transition-colors",
                g.id === p.gate ? "border-volt bg-volt text-volt-foreground" : g.id < p.gate ? "border-volt/40 text-volt" : "border-border text-muted-foreground hover:border-volt/40",
              )}
            >
              {g.code}
            </button>
          ))}
        </div>
        <div className="mt-1.5 text-[11px] text-muted-foreground">{GATES[p.gate].title}</div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          size="sm"
          variant={paidKinds.has("rebate") ? "secondary" : "volt"}
          disabled={!funded || paidKinds.has("rebate")}
          onClick={() => onPay("rebate", rebate, `Ameren ${p.rateClass} rebate, ${p.specs.kwDc} kW-DC × $300${p.specs.batteryKwh ? ` + ${p.specs.batteryKwh} kWh × $300` : ""}`)}
        >
          Inject Ameren rebate {usd(rebate)}
        </Button>
        <Button
          size="sm"
          variant={paidKinds.has("rec") ? "secondary" : "volt"}
          disabled={!funded || paidKinds.has("rec")}
          onClick={() =>
            onPay("rec", recNet, `Illinois Shines Part II — ${Math.round(t.firstPaymentPct * 100)}% of ${t.totalRecs} RECs × $${t.effectivePrice.toFixed(2)}, net of 5% collateral and 3% reserve`)
          }
        >
          Inject first REC payment {usd(recNet)}
        </Button>
        <Button size="sm" variant="secondary" disabled={!funded} onClick={() => onPay("tail", tailQuarter, "REC tail quarterly payment (80% shares / 20% originator)")}>
          Inject tail quarter {usd(tailQuarter)}
        </Button>
        {!funded && <span className="self-center text-[11px] text-muted-foreground">Job must be fully bonded before takeout can be distributed.</span>}
      </div>
    </div>
  );
}
