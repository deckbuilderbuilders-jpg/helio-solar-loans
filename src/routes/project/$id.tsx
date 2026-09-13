import { Link, createFileRoute } from "@tanstack/react-router";
import { GateTimeline } from "@/components/helio/GateTimeline";
import { SourcesPopover } from "@/components/helio/Sources";
import { Empty, GateChip, LoanLink, Pill, Row, SectionHead, Stat, countdown, dateShort, pct, usd, usdc } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { AMEREN_REBATE_CLOCK_DAYS, GATES } from "@/lib/helio/constants";
import { effectiveState, interestAccrued, ltvCapBps, short, totalDue } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";
import { lendable } from "@/lib/helio/takeout";

export const Route = createFileRoute("/project/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Project ${params.id} — HELIO` },
      { name: "description", content: "Illinois solar Project Note: G0–G7 milestone timeline, takeout breakdown, rebate clock and loan waterfall." },
      { property: "og:title", content: `Project ${params.id} — HELIO` },
      { property: "og:description", content: "Milestone timeline and takeout breakdown for an Illinois Shines project note." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectPage,
});

function ProjectPage() {
  const { id } = Route.useParams();
  const { state, now } = useHelio();
  const p = state.projects.find((x) => x.id === id);
  if (!p) return <div className="mx-auto max-w-3xl px-4 py-20"><Empty title="Project not found" body={`No project note with id ${id} in the seeded ledger.`} cta={<Button asChild variant="outline"><Link to="/borrow">Back to borrow</Link></Button>} /></div>;

  const t = p.takeout;
  const col = state.collections.find((c) => c.slug === p.collection)!;
  const loans = state.loans.filter((l) => l.projectId === p.id).sort((a, b) => b.startAt - a.startAt);
  const live = loans.find((l) => l.id === p.activeLoanId);
  const cap = ltvCapBps(col, p.gate);
  const rebateClockStart = [...state.log].reverse().find((e) => e.detail.includes(p.id) && e.ix === "admin_set_gate" && e.detail.includes("G3"))?.at;
  const rebateEta = p.gate >= 5 ? null : rebateClockStart ? rebateClockStart + AMEREN_REBATE_CLOCK_DAYS * 86400 : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow mb-2 flex flex-wrap items-center gap-2">
            <span className="text-volt">{p.collection}</span>· Illinois Shines Group A · {t.isSmallDg ? "Small DG" : "Large DG"} · Ameren {p.rateClass} · <span className="font-mono normal-case">{p.id}</span>
          </div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">{p.name}</h1>
          <div className="mt-1 text-sm text-muted-foreground">{p.address} · Approved Vendor <span className="font-mono">{short(p.borrower)}</span></div>
        </div>
        <div className="flex items-center gap-2">
          <GateChip gate={p.gate} />
          {live && <Pill state={effectiveState(live, now)} />}
          <SourcesPopover />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="System" value={`${p.specs.kwAc} / ${p.specs.kwDc}`} sub={`kW AC / kW DC${p.specs.batteryKwh ? ` · ${p.specs.batteryKwh} kWh ESS` : ""}`} />
        <Stat label="Takeout" value={usd(t.takeout)} sub={`lendable ${usd(lendable(t.takeout, cap))} @ ${pct(cap)}`} accent />
        <Stat label="ICC Trade Date" value={dateShort(p.tradeDate)} sub="Part I approved" />
        <Stat label="Energize by" value={dateShort(p.energizationDeadline)} sub="18 months from Trade Date" />
        <Stat label="Project Note" value={p.noteFrozen ? "Frozen" : "Free"} sub={`Token-2022 · ${short(p.noteMint)} · owner ${short(p.noteOwner)}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="panel p-5">
          <SectionHead eyebrow="Milestones" title="G0 → G7" />
          <GateTimeline gate={p.gate} />
          <div className="mt-5 space-y-2 rounded-sm bg-surface p-3 text-xs text-muted-foreground">
            <div className="flex justify-between"><span>Ameren rebate clock</span><span className="num text-foreground">{p.gate >= 5 ? "received" : rebateEta ? (rebateEta > now ? `~${countdown(rebateEta - now)}` : "due now") : `starts at G3 · ${AMEREN_REBATE_CLOCK_DAYS}d`}</span></div>
            <div className="flex justify-between"><span>Next REC invoice window</span><span className="num text-foreground">{p.gate >= 6 ? "first payment received" : p.gate >= 4 ? "Part II approved — invoice open" : "after Part II / Schedule B"}</span></div>
            <div className="flex justify-between"><span>Net metering after rebate</span><span className="text-foreground">supply + transmission only</span></div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-5">
            <SectionHead eyebrow="Takeout engine" title="Contracted cash" />
            <div className="divide-y divide-border/60 text-sm">
              <Row label="REC price" sub={`$${t.basePrice.toFixed(2)} Group A ${t.tierLabel}${t.customerOwnedAdder ? " + $20 customer-owned" : ""}${t.eecAdder ? " + $5 EEC" : ""}`} value={`$${t.effectivePrice.toFixed(2)} / REC`} />
              <Row label="REC quantity" sub={`${t.year1Recs.toFixed(2)} yr-1 · 15 yr · 0.5%/yr degradation`} value={`${t.totalRecs} RECs`} />
              <Row label="REC Purchase Amount" value={usd(t.recPurchaseAmount)} />
              <Row label={`First REC payment (${Math.round(t.firstPaymentPct * 100)}% at Part II)`} value={usd(t.firstRecPayment)} />
              <Row label="Ameren solar rebate" sub={`${p.specs.kwDc} kW-DC × $300`} value={usd(t.amerenSolarRebate)} />
              {t.amerenBatteryRebate > 0 && <Row label="Ameren battery rebate" sub={`${p.specs.batteryKwh} kWh × $300 (paired)`} value={usd(t.amerenBatteryRebate)} />}
              <Row label="REC-contract collateral (5%)" value={`−${usd(t.recCollateralLock)}`} muted />
              <Row label="Protocol haircut reserve (3%)" value={`−${usd(t.protocolReserve)}`} muted />
              <Row label="Takeout" value={usd(t.takeout)} strong />
              <Row label="6-year REC tail (stays with AV)" value={usd(t.recTail)} muted />
            </div>
          </div>

          <div className="panel p-5">
            <SectionHead eyebrow="Loans" title={live ? "Live loan" : "Loan history"} right={!live && p.gate >= 2 && p.gate <= 4 ? <Button asChild size="sm" variant="volt"><Link to="/borrow">Take an offer</Link></Button> : undefined} />
            {loans.length === 0 ? (
              <div className="text-sm text-muted-foreground">No loans yet against this note.</div>
            ) : (
              <div className="space-y-3">
                {loans.map((l) => {
                  const st = effectiveState(l, now);
                  return (
                    <div key={l.id} className="rounded-sm border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <LoanLink id={l.id}>{l.id}</LoanLink>
                        <Pill state={st} />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Stat label="Principal" value={usdc(l.principal, 0)} sub={`${pct(l.apyBps)} · ${Math.round(l.termSeconds / 86400)}d`} />
                        <Stat label={st === "Repaid" ? "Interest paid" : "Accrued"} value={usdc(st === "Repaid" ? l.interestPaid : interestAccrued(l, now))} sub={`due ${usdc(totalDue(l) - l.principal)}`} />
                        <Stat label="Escrow" value={usdc(l.escrowBalance)} sub={`${l.payments.length} takeout payments`} />
                        <Stat label={st === "Repaid" || st === "Foreclosed" ? "Residual to AV" : "Expires"} value={st === "Repaid" || st === "Foreclosed" ? usdc(l.residualToBorrower) : countdown(l.expiresAt - now)} />
                      </div>
                      {l.payments.length > 0 && (
                        <div className="mt-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                          Waterfall: {l.payments.map((pay) => `${pay.kind === "rebate" ? "Ameren rebate" : "REC payment"} ${usdc(pay.amount, 0)} (${dateShort(pay.at)})`).join(" · ")}
                          {" → "}principal {usdc(l.principalRepaid, 0)} → interest {usdc(l.interestPaid)} (protocol {usdc(l.protocolCutPaid)}) → residual {usdc(l.residualToBorrower)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 text-[11px] text-muted-foreground">
        Gate labels: {GATES.map((g) => `${g.code} ${g.title}`).join(" · ")}.
      </div>
    </div>
  );
}
