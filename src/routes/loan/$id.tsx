import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Empty, GateChip, Pill, ProjectLink, Row, SectionHead, Stat, countdown, dateShort, pct, usdc } from "@/components/helio/ui";
import { CompareChip } from "@/components/helio/WhyYield";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXTENSION_PENALTY_BPS, GRACE_SECONDS, PROTOCOL_FEE_BPS } from "@/lib/helio/constants";
import { effectiveState, interestAccrued, interestDue, isPastGrace, outstanding, short, totalDue } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/loan/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Loan ${params.id} — HELIO` },
      { name: "description", content: "Fixed-term USDC loan term sheet: live accrued interest, escrow waterfall, repay, extend and foreclose." },
      { property: "og:title", content: `Loan ${params.id} — HELIO` },
      { property: "og:description", content: "Term sheet and live waterfall for a HELIO takeout loan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoanPage,
});

function LoanPage() {
  const { id } = Route.useParams();
  const h = useHelio();
  const { state, now, wallet } = h;
  const l = state.loans.find((x) => x.id === id);
  const [topUp, setTopUp] = useState<number>(0);
  if (!l) return <div className="mx-auto max-w-3xl px-4 py-20"><Empty title="Loan not found" body={`No loan ${id} in the seeded ledger.`} cta={<Button asChild variant="outline"><Link to="/lend">Back to lend</Link></Button>} /></div>;

  const p = state.projects.find((x) => x.id === l.projectId)!;
  const st = effectiveState(l, now);
  const open = st === "Active" || st === "Extended" || st === "Defaulted";
  const due = totalDue(l);
  const out = outstanding(l);
  const accrued = interestAccrued(l, now);
  const shortfall = Math.max(0, out - l.escrowBalance);
  const isBorrower = wallet === l.borrower;
  const isLender = wallet === l.lender;
  const graceEnd = l.expiresAt + GRACE_SECONDS;
  const pastGrace = isPastGrace(l, now);
  const termDays = Math.round(l.termSeconds / 86400);
  const baseInterest = (l.principal * l.apyBps * l.termSeconds) / (10_000 * 365 * 86400);
  const progress = Math.min(1, Math.max(0, (now - l.startAt) / (l.expiresAt - l.startAt)));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow mb-2 flex items-center gap-2"><span className="text-volt">{l.collection}</span>· loan <span className="font-mono normal-case">{l.id}</span> · offer <span className="font-mono normal-case">{l.offerId}</span></div>
          <h1 className="font-display text-3xl font-bold md:text-4xl"><ProjectLink id={p.id}>{p.name}</ProjectLink></h1>
          <div className="mt-1 text-sm text-muted-foreground">Lender <span className="font-mono">{short(l.lender)}</span> → AV <span className="font-mono">{short(l.borrower)}</span> · note {p.noteFrozen ? "frozen to program" : `owned by ${short(p.noteOwner)}`}</div>
        </div>
        <div className="flex items-center gap-2"><GateChip gate={p.gate} /><Pill state={st} className="text-sm" /></div>
      </div>

      {/* Clock */}
      <div className="panel mb-6 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="eyebrow">{st === "Repaid" ? "Repaid" : st === "Foreclosed" ? "Foreclosed" : st === "Defaulted" ? (pastGrace ? "Past grace — foreclosable" : "Expired — in 72h grace") : "Time to expiry"}</div>
            <div className={cn("num mt-1 text-4xl font-medium", st === "Defaulted" && "text-destructive", (st === "Active" || st === "Extended") && "text-volt")}>
              {st === "Repaid" || st === "Foreclosed" ? dateShort(l.closedAt ?? now) : st === "Defaulted" ? (pastGrace ? "00:00:00" : countdown(graceEnd - now)) : countdown(l.expiresAt - now)}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>Start {dateShort(l.startAt)} · Expiry {dateShort(l.expiresAt)}{l.extended ? " (extended +30d)" : ""}</div>
            <div>Grace ends {dateShort(graceEnd)} · no oracle, no price liquidation</div>
          </div>
        </div>
        <div className="relative mt-4 h-2 rounded-sm bg-surface-2">
          <div className={cn("absolute h-2 rounded-sm", st === "Defaulted" ? "bg-destructive" : st === "Repaid" ? "bg-positive" : "bg-volt")} style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Term sheet */}
        <div className="panel p-5">
          <SectionHead eyebrow="Term sheet" title="Fixed term, fixed interest" />
          <div className="divide-y divide-border/60 text-sm">
            <Row label="Principal" value={usdc(l.principal)} strong />
            <Row label="APY" sub={`${termDays}-day term · simple interest`} value={pct(l.apyBps)} />
            <Row label="Interest for term" sub={`${usdc(l.principal, 0)} × ${pct(l.apyBps)} × ${termDays}/365`} value={usdc(baseInterest)} />
            {l.extended && <Row label={`Extension interest (+${EXTENSION_PENALTY_BPS / 100}% for 30d)`} value={usdc((l.principal * (l.apyBps + EXTENSION_PENALTY_BPS) * 30 * 86400) / (10_000 * 365 * 86400))} />}
            <Row label="Accrued so far (display)" value={usdc(accrued)} muted />
            <Row label="Origination paid at close" sub={`${pct(l.originationBps, 1)} → treasury`} value={usdc(l.originationPaid)} muted />
            <Row label="Protocol fee on interest" value={`${PROTOCOL_FEE_BPS / 100}% · lender net ${((l.apyBps / 100) * (1 - PROTOCOL_FEE_BPS / 10_000)).toFixed(1)}% APY`} muted />
            <Row label="Total due" value={usdc(due)} strong />
            <Row label="Outstanding" value={usdc(out)} />
          </div>
          <CompareChip apyBps={l.apyBps} termDays={termDays} className="mt-4" />
        </div>

        {/* Waterfall */}
        <div className="space-y-6">
          <div className="panel p-5">
            <SectionHead eyebrow="Escrow waterfall" title="Where the takeout goes" />
            <div className="mb-3 space-y-1.5">
              {l.payments.length === 0 ? (
                <div className="text-xs text-muted-foreground">No takeout payments posted yet. The oracle records the Ameren rebate (≈60d post-PTO) and the first REC invoice into this loan&apos;s escrow.</div>
              ) : l.payments.map((pay) => (
                <div key={pay.id} className="flex items-center justify-between rounded-sm bg-surface px-3 py-2 text-xs">
                  <span>{pay.kind === "rebate" ? "Ameren rebate" : "Illinois Shines REC payment"} <span className="text-muted-foreground">· {pay.memo}</span></span>
                  <span className="num">{usdc(pay.amount)} <span className="text-muted-foreground">{dateShort(pay.at)}</span></span>
                </div>
              ))}
            </div>
            <div className="divide-y divide-border/60 text-sm">
              <Row label="1 · Escrow balance" value={usdc(l.escrowBalance)} strong />
              <Row label="2 · Principal → lender" value={usdc(l.principalRepaid)} sub={`of ${usdc(l.principal, 0)}`} />
              <Row label="3 · Interest → lender (net)" value={usdc(l.interestPaid)} sub={`protocol cut ${usdc(l.protocolCutPaid)}`} />
              <Row label="4 · Origination (already taken)" value={usdc(l.originationPaid)} muted />
              <Row label="5 · Residual → borrower" value={usdc(l.residualToBorrower)} strong />
            </div>
          </div>

          {/* Actions */}
          {open && (
            <div className="panel p-5">
              <SectionHead eyebrow="Actions" title={isBorrower ? "Borrower" : isLender ? "Lender" : "Connect a party"} />
              {isBorrower && (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Repay sweeps escrow first. Shortfall after escrow: <span className="num text-foreground">{usdc(shortfall)}</span> · your wallet {usdc(h.balance, 0)}.
                  </div>
                  <div className="flex gap-2">
                    <Input type="number" className="num" min={0} value={topUp} onChange={(e) => setTopUp(Number(e.target.value))} placeholder="wallet top-up USDC" />
                    <Button variant="outline" onClick={() => setTopUp(Math.min(shortfall, h.balance))}>Max</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="volt" onClick={() => h.repay(l.id, topUp)}>Repay {usdc(Math.min(out, l.escrowBalance + topUp))}</Button>
                    <Button variant="outline" disabled={l.extended || pastGrace} onClick={() => h.extend(l.id)}>
                      {l.extended ? "Already extended" : `Extend 30d at ${(l.apyBps + EXTENSION_PENALTY_BPS) / 100}%`}
                    </Button>
                  </div>
                  <div className="text-[11px] text-muted-foreground">Full repay thaws the Project Note and sets G7. Partial prepay keeps the loan open. One extension max, then foreclose.</div>
                </div>
              )}
              {isLender && (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    {pastGrace ? "Grace elapsed. Foreclosing transfers the Project Note (claim on rebate + first REC invoice) and sweeps escrow to you." : `Foreclose unlocks ${countdown(Math.max(0, graceEnd - now))} after expiry + 72h grace.`}
                  </div>
                  <Button variant="destructive" disabled={!pastGrace} onClick={() => h.foreclose(l.id)}>Foreclose</Button>
                </div>
              )}
              {!isBorrower && !isLender && <div className="text-xs text-muted-foreground">Load the demo AV to repay/extend, or the demo lender to foreclose. Anyone can post takeout payments from the oracle panel.</div>}
            </div>
          )}
          {st === "Foreclosed" && (
            <div className="panel border-destructive/40 p-5 text-sm text-muted-foreground">
              Foreclosed {dateShort(l.closedAt ?? now)}. The lender now holds the Project Note — the claim on the Ameren rebate and the first REC invoice — <span className="text-foreground">not the physical panels</span>.
            </div>
          )}
          {st === "Repaid" && (
            <div className="panel border-positive/40 p-5 text-sm text-muted-foreground">
              Repaid {dateShort(l.closedAt ?? now)}. Note thawed, project at G7. Residual <span className="num text-positive">{usdc(l.residualToBorrower)}</span> went back to the AV, who also keeps the <span className="num text-foreground">{usdc(p.takeout.recTail, 0)}</span> six-year REC tail.
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3 md:w-1/2">
        <Stat label="Lender" value={short(l.lender)} />
        <Stat label="Borrower" value={short(l.borrower)} />
        <Stat label="Escrow PDA" value={`esc-${l.id.slice(-4)}`} sub="USDC token account" />
      </div>
    </div>
  );
}
