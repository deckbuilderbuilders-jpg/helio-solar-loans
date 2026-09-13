import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GateTimeline } from "@/components/helio/GateTimeline";
import { Empty, GateChip, LoanLink, Pill, ProjectLink, SectionHead, Stat, dateShort, usd, usdc } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GATES } from "@/lib/helio/constants";
import { effectiveState, outstanding, short } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";
import type { Gate } from "@/lib/helio/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/oracle")({
  head: () => ({
    meta: [
      { title: "Milestone oracle — HELIO admin" },
      { name: "description", content: "Demo milestone oracle: advance G0–G7 gates and inject mock Ameren rebate / Illinois Shines REC payments into loan escrows." },
      { property: "og:title", content: "Milestone oracle — HELIO" },
      { property: "og:description", content: "Advance gates and post takeout payments so the demo never depends on Illinois servers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Oracle,
});

function Oracle() {
  const h = useHelio();
  const { state, now, role, wallet } = h;
  const [sel, setSel] = useState<string | null>(null);
  const project = state.projects.find((p) => p.id === sel) ?? state.projects[0];
  const loan = project?.activeLoanId ? state.loans.find((l) => l.id === project.activeLoanId) : undefined;
  const [amount, setAmount] = useState<number>(0);
  const isAdmin = role === "admin";

  const t = project?.takeout;
  const rebateAmt = t ? t.amerenSolarRebate + t.amerenBatteryRebate : 0;
  const recAmt = t ? t.firstRecPayment - t.recCollateralLock : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHead
        eyebrow="Oracle · admin"
        title="Milestone writer"
        right={
          <div className="flex items-center gap-2">
            <span className={cn("rounded-sm border px-2 py-1 font-mono text-[11px]", isAdmin ? "border-volt/50 text-volt" : "border-border text-muted-foreground")}>
              {isAdmin ? `signer ${short(wallet ?? "")} · admin` : wallet ? "connected wallet is not the admin" : "not connected"}
            </span>
            <Button size="sm" variant="outline" onClick={() => h.connect("admin")}>Load oracle admin</Button>
          </div>
        }
      />
      <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
        In production this is a tiny server that watches the Illinois Shines portal and Ameren rebate status and signs <code className="font-mono text-xs">admin_set_gate</code> / <code className="font-mono text-xs">record_takeout_payment</code>.
        For the demo you are the oracle: punch gates and drop mock USDC into loan escrows so nothing depends on Illinois servers.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="panel">
          <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">{state.projects.length} project notes</div>
          <div className="divide-y divide-border">
            {state.projects.map((p) => {
              const l = p.activeLoanId ? state.loans.find((x) => x.id === p.activeLoanId) : undefined;
              return (
                <button key={p.id} onClick={() => setSel(p.id)} className={cn("flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-surface-2/60", project?.id === p.id && "bg-volt/5")}>
                  <div className="min-w-0">
                    <div className="truncate text-sm">{p.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{p.collection} · {p.specs.kwAc} kW AC · {p.id}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <GateChip gate={p.gate} />
                    {l && <Pill state={effectiveState(l, now)} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {!project ? (
          <Empty title="No projects" body="Reset the demo from the wallet menu." />
        ) : (
          <div className="space-y-6">
            <div className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="eyebrow">Project</div>
                  <div className="font-display text-xl font-semibold"><ProjectLink id={project.id}>{project.name}</ProjectLink></div>
                  <div className="text-xs text-muted-foreground">Trade Date {dateShort(project.tradeDate)} · AV {short(project.borrower)} · {loan ? <>live loan <LoanLink id={loan.id}>{loan.id}</LoanLink></> : "no active loan"}</div>
                </div>
                <GateChip gate={project.gate} />
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-[1fr_auto]">
                <GateTimeline gate={project.gate} />
                <div className="space-y-1.5">
                  <div className="eyebrow mb-2">Set gate</div>
                  {GATES.filter((g) => g.id < 7).map((g) => (
                    <Button
                      key={g.id}
                      size="sm"
                      variant={project.gate === g.id ? "volt" : "outline"}
                      className="w-full justify-start font-mono"
                      disabled={!isAdmin}
                      onClick={() => h.setGate(project.id, g.id as Gate)}
                    >
                      {g.code}
                    </Button>
                  ))}
                  <div className="pt-1 text-[10px] text-muted-foreground">G7 is set by the program on full repay.</div>
                </div>
              </div>
            </div>

            <div className="panel p-5">
              <SectionHead eyebrow="Inject takeout payment" title="Mock Ameren / ABP wire → loan escrow" />
              {!loan ? (
                <div className="text-sm text-muted-foreground">No active loan on this note. Payments are posted into a loan escrow; accept an offer first from /borrow.</div>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-3 gap-3">
                    <Stat label="Escrow" value={usdc(loan.escrowBalance, 0)} />
                    <Stat label="Outstanding" value={usdc(outstanding(loan), 0)} />
                    <Stat label="State" value={<Pill state={effectiveState(loan, now)} />} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button variant="volt" className="h-auto flex-col items-start py-3" onClick={() => h.recordPayment(loan.id, "rebate", rebateAmt, `Ameren ${project.rateClass} smart-inverter rebate`)}>
                      <span>Ameren rebate arrives → G5</span>
                      <span className="num text-xs opacity-80">{usd(rebateAmt)} · {project.specs.kwDc} kW-DC × $300{project.specs.batteryKwh ? ` + ${project.specs.batteryKwh} kWh × $300` : ""}</span>
                    </Button>
                    <Button variant="volt" className="h-auto flex-col items-start py-3" onClick={() => h.recordPayment(loan.id, "rec", recAmt, "Illinois Shines first REC payment (50%) net of 5% collateral")}>
                      <span>First REC payment arrives → G6</span>
                      <span className="num text-xs opacity-80">{usd(recAmt)} · {t?.totalRecs} RECs × ${t?.effectivePrice.toFixed(2)} × {Math.round((t?.firstPaymentPct ?? 0) * 100)}% − 5%</span>
                    </Button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Input type="number" className="num" placeholder="custom USDC amount" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
                    <Button variant="outline" disabled={amount <= 0} onClick={() => h.recordPayment(loan.id, "rebate", amount, "manual rebate credit")}>as rebate</Button>
                    <Button variant="outline" disabled={amount <= 0} onClick={() => h.recordPayment(loan.id, "rec", amount, "manual REC credit")}>as REC</Button>
                  </div>
                  <div className="mt-3 text-[11px] text-muted-foreground">
                    Anyone can post into escrow (it is just USDC into a PDA). Once escrow ≥ outstanding, the borrower — or you, as admin — triggers <code className="font-mono">repay</code> to run the waterfall.
                    {loan.escrowBalance >= outstanding(loan) && loan.borrower && (
                      <div className="mt-2">
                        <Button size="sm" variant="volt" onClick={() => { h.connect("av"); setTimeout(() => h.repay(loan.id, 0), 50); }}>Switch to AV &amp; run waterfall</Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="panel p-5">
              <SectionHead eyebrow="Treasury" title="Protocol fees" right={<Button size="sm" variant="outline" disabled={!isAdmin || state.config.treasuryBalance <= 0} onClick={() => h.claimFees()}>Claim {usdc(state.config.treasuryBalance, 0)}</Button>} />
              <div className="text-xs text-muted-foreground">Unclaimed {usdc(state.config.treasuryBalance)} · treasury wallet {short(state.config.treasury)} holds {usdc(state.balances[state.config.treasury] ?? 0)}.</div>
            </div>
          </div>
        )}
      </div>

      <div className="panel mt-6">
        <div className="border-b border-border px-4 py-3"><div className="eyebrow">Transaction log · newest first</div></div>
        <div className="max-h-80 overflow-auto font-mono text-[11px]">
          {[...state.log].reverse().slice(0, 60).map((e) => (
            <div key={e.id} className="grid grid-cols-[110px_150px_100px_1fr] gap-3 border-b border-border/50 px-4 py-1.5">
              <span className="text-muted-foreground">{dateShort(e.at)}</span>
              <span className="text-volt">{e.ix}</span>
              <span className="text-muted-foreground">{short(e.signer)}</span>
              <span className="truncate">{e.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
