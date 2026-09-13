import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SpecForm, useTakeoutQuote } from "@/components/helio/Calculator";
import { GateTimeline } from "@/components/helio/GateTimeline";
import { OfferTable } from "@/components/helio/OfferTable";
import { SourcesPopover } from "@/components/helio/Sources";
import { Empty, GateChip, LoanLink, Pill, ProjectLink, Row, SectionHead, Stat, dateShort, days, pct, usd, usdc } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OFFER_GRID } from "@/lib/helio/constants";
import { effectiveState, ltvCapBps, matchCollection } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";
import { FLAGSHIP_SPECS, lendable, type ProjectSpecs } from "@/lib/helio/takeout";
import type { Gate, Project } from "@/lib/helio/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/borrow")({
  head: () => ({
    meta: [
      { title: "Borrow — HELIO for Illinois Approved Vendors" },
      { name: "description", content: "List a solar project note, get an instant takeout quote from the Illinois Shines + Ameren engine, and accept the best USDC offer." },
      { property: "og:title", content: "Borrow against your takeout — HELIO" },
      { property: "og:description", content: "Instant takeout quote and one-click USDC loans for Illinois Approved Vendors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Borrow,
});

function Borrow() {
  const h = useHelio();
  const { state, now, wallet } = h;
  const navigate = useNavigate();
  const [specs, setSpecs] = useState<ProjectSpecs>(FLAGSHIP_SPECS);
  const [name, setName] = useState("Grand Ave — Decatur");
  const [address, setAddress] = useState("Decatur, IL 62521");
  const [rateClass, setRateClass] = useState<"DS-1" | "DS-2">("DS-1");
  const [gate, setGate] = useState<Gate>(3);
  const grid = OFFER_GRID.find((g) => g.gate === gate) ?? OFFER_GRID[1];
  const { t, error } = useTakeoutQuote(specs, grid);

  const collection = useMemo(() => {
    try { return matchCollection(state.collections, specs); } catch { return null; }
  }, [state.collections, specs]);
  const cap = collection ? ltvCapBps(collection, gate) : grid.ltvBps;
  const lendableNow = t ? lendable(t.takeout, cap) : 0;

  const myProjects = state.projects.filter((p) => p.borrower === wallet);
  const [selected, setSelected] = useState<string | null>(null);
  const selProject: Project | undefined = myProjects.find((p) => p.id === selected) ?? myProjects.find((p) => !p.activeLoanId && p.gate >= 2 && p.gate <= 4);

  const eligible = useMemo(() => {
    if (!selProject) return [];
    const capBps = ltvCapBps(state.collections.find((c) => c.slug === selProject.collection)!, selProject.gate);
    const max = lendable(selProject.takeout.takeout, capBps);
    return state.offers
      .filter((o) => o.state === "Open" && o.collection === selProject.collection && o.minGate <= selProject.gate && o.principal <= max && o.expiresAt > now)
      .sort((a, b) => a.apyBps - b.apyBps || b.principal - a.principal);
  }, [selProject, state.offers, state.collections, now]);

  const list = () => {
    const p = h.listProject({ name, address, rateClass, specs, gate });
    if (p) setSelected(p.id);
  };
  const accept = (offerId: string) => {
    if (!selProject) return;
    const l = h.acceptOffer(offerId, selProject.id);
    if (l) navigate({ to: "/loan/$id", params: { id: l.id } });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHead eyebrow="Borrow · Approved Vendor" title="List a project, take the best offer" right={<SourcesPopover />} />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Create project */}
        <div className="panel p-5">
          <div className="eyebrow mb-4">1 · New Project Note</div>
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-1"><Label className="text-xs">Site name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Ameren class</Label>
              <div className="flex rounded-sm border border-border p-0.5">
                {(["DS-1", "DS-2"] as const).map((r) => (
                  <button key={r} onClick={() => setRateClass(r)} className={cn("rounded-sm px-2.5 py-1.5 font-mono text-xs", rateClass === r ? "bg-volt text-volt-foreground" : "")}>{r}</button>
                ))}
              </div>
            </div>
          </div>
          <SpecForm specs={specs} onChange={setSpecs} />
          <div className="mt-4">
            <Label className="mb-1.5 block text-xs">Current milestone (demo: pick where the project is today)</Label>
            <div className="grid grid-cols-5 gap-1 rounded-sm border border-border p-1">
              {([0, 1, 2, 3, 4] as Gate[]).map((g) => (
                <button key={g} onClick={() => setGate(g)} className={cn("rounded-sm px-2 py-1.5 font-mono text-xs", gate === g ? "bg-volt text-volt-foreground" : "hover:bg-secondary")}>G{g}</button>
              ))}
            </div>
            {gate < 2 && <div className="mt-1 text-[11px] text-warning">Loans originate at G2 (ICC Trade Date) or later. You can list now and the oracle advances the gate.</div>}
          </div>

          {/* Instant quote */}
          <div className="mt-5 rounded-sm border border-volt/30 bg-volt/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="eyebrow">Instant takeout quote</div>
              {collection ? <span className="font-mono text-xs text-volt">{collection.slug}</span> : <span className="text-xs text-destructive">no matching collection</span>}
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            {t && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Install cost" value={usd(t.installCost)} />
                  <Stat label="Takeout" value={usd(t.takeout)} />
                  <Stat label={`Lendable @ ${pct(cap)}`} value={usd(lendableNow)} accent />
                </div>
                <div className="mt-3 divide-y divide-border/50 text-xs">
                  <Row label="Ameren rebate" sub={`${t.specs.kwDc} kW-DC × $300${t.amerenBatteryRebate ? ` + ${t.specs.batteryKwh} kWh × $300` : ""}`} value={usd(t.amerenSolarRebate + t.amerenBatteryRebate)} />
                  <Row label={`First REC payment ${Math.round(t.firstPaymentPct * 100)}%`} sub={`${t.totalRecs} RECs × $${t.effectivePrice.toFixed(2)} (${t.tierLabel}${t.customerOwnedAdder ? " + $20" : ""}${t.eecAdder ? " + $5" : ""})`} value={usd(t.firstRecPayment)} />
                  <Row label="Collateral lock 5% + reserve 3%" value={`−${usd(t.recCollateralLock + t.protocolReserve)}`} muted />
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-[11px] text-muted-foreground">Mints a Token-2022 Project Note to your wallet. Nothing is borrowed yet.</div>
            <Button variant="volt" onClick={list} disabled={!wallet || !t || !collection}>{wallet ? "List project note" : "Connect demo AV first"}</Button>
          </div>
        </div>

        {/* My projects + best offers */}
        <div className="space-y-6">
          <div className="panel p-5">
            <div className="eyebrow mb-4">2 · Your project notes</div>
            {!wallet ? (
              <Empty title="Not connected" body="Connect → Load demo AV. The seeded vendor already has six project notes in various gates." />
            ) : myProjects.length === 0 ? (
              <Empty title="No project notes" body="List one on the left, or load the demo AV wallet." />
            ) : (
              <div className="space-y-2">
                {myProjects.map((p) => {
                  const loan = p.activeLoanId ? state.loans.find((l) => l.id === p.activeLoanId) : undefined;
                  const active = selProject?.id === p.id;
                  return (
                    <button key={p.id} onClick={() => setSelected(p.id)} className={cn("w-full rounded-sm border p-3 text-left transition-colors", active ? "border-volt bg-volt/5" : "border-border hover:border-volt/40")}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 truncate text-sm font-medium">{p.name}</div>
                        <div className="flex items-center gap-1.5">
                          <GateChip gate={p.gate} />
                          {loan && <Pill state={effectiveState(loan, now)} />}
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 font-mono text-[10px] text-muted-foreground">
                        <span>{p.collection}</span><span>{p.specs.kwAc} kW AC / {p.specs.kwDc} kW DC{p.specs.batteryKwh ? ` + ${p.specs.batteryKwh} kWh` : ""}</span><span>takeout {usd(p.takeout.takeout)}</span>
                        <span>{p.noteFrozen ? "note frozen" : "note free"}</span>
                      </div>
                      <div className="mt-2"><GateTimeline gate={p.gate} compact /></div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="border-b border-border px-5 py-3">
              <div className="eyebrow">3 · Best offers for {selProject ? <ProjectLink id={selProject.id}>{selProject.name}</ProjectLink> : "—"}</div>
              {selProject && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {selProject.collection} · gate G{selProject.gate} · max principal <span className="num text-foreground">{usd(lendable(selProject.takeout.takeout, ltvCapBps(state.collections.find((c) => c.slug === selProject.collection)!, selProject.gate)))}</span>
                  {selProject.activeLoanId && <> · already borrowed: <LoanLink id={selProject.activeLoanId}>{selProject.activeLoanId}</LoanLink></>}
                  {" "}· Trade Date {dateShort(selProject.tradeDate)} · energize by {dateShort(selProject.energizationDeadline)}
                </div>
              )}
            </div>
            {!selProject ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Select a project note without an active loan.</div>
            ) : selProject.activeLoanId ? (
              <div className="p-6 text-center text-sm text-muted-foreground">This note is frozen to loan {selProject.activeLoanId}. Repay to thaw it.</div>
            ) : selProject.gate < 2 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Gate G{selProject.gate} — loans open at G2 (ICC Trade Date). Advance it in the oracle panel.</div>
            ) : (
              <OfferTable
                offers={eligible}
                highlightId={eligible[0]?.id ?? null}
                action={(o) => (
                  <Button size="sm" variant={eligible[0]?.id === o.id ? "volt" : "outline"} onClick={() => accept(o.id)}>
                    {eligible[0]?.id === o.id ? "Accept best" : "Accept"}
                  </Button>
                )}
                emptyText="No offer fits this note yet (collection, gate and LTV must all match). Post one from /lend."
              />
            )}
            {selProject && eligible[0] && (
              <div className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
                Best: <span className="num text-volt">{usdc(eligible[0].principal, 0)}</span> at {pct(eligible[0].apyBps)} for {days(eligible[0].termSeconds)} → you receive {usdc(eligible[0].principal * (1 - eligible[0].originationBps / 10_000), 0)} after origination. Note freezes on accept.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
