import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { OfferTable } from "@/components/helio/OfferTable";
import { Empty, GateChip, LoanLink, Pill, ProjectLink, SectionHead, Stat, countdown, days, pct, usd, usdc } from "@/components/helio/ui";
import { CompareChip } from "@/components/helio/WhyYield";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GRACE_SECONDS, OFFER_GRID } from "@/lib/helio/constants";
import { effectiveState, interestAccrued, isPastGrace, totalDue } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";
import type { Collection, Gate } from "@/lib/helio/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lend")({
  head: () => ({
    meta: [
      { title: "Lend USDC — HELIO order book" },
      { name: "description", content: "Post fixed-term USDC offers on Illinois solar takeout collections. 18–28% APY, 30–90 day terms, no price liquidations." },
      { property: "og:title", content: "Lend USDC — HELIO order book" },
      { property: "og:description", content: "Collection order book for Illinois Approved Vendor takeout loans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Lend,
});

function Lend() {
  const h = useHelio();
  const { state, now, wallet, role } = h;
  const [slug, setSlug] = useState(state.collections[0]?.slug ?? "A-SDG-10");
  const [postOpen, setPostOpen] = useState(false);
  const col: Collection = state.collections.find((c) => c.slug === slug) ?? state.collections[0]!;

  const offers = useMemo(
    () => state.offers.filter((o) => o.collection === slug && o.state === "Open").sort((a, b) => a.apyBps - b.apyBps || b.principal - a.principal),
    [state.offers, slug],
  );
  const myLoans = state.loans.filter((l) => l.lender === wallet && effectiveState(l, now) !== "Repaid" && effectiveState(l, now) !== "Foreclosed");
  const myClosed = state.loans.filter((l) => l.lender === wallet && (effectiveState(l, now) === "Repaid" || effectiveState(l, now) === "Foreclosed"));
  const myOffers = state.offers.filter((o) => o.lender === wallet && o.state === "Open");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHead
        eyebrow="Lend"
        title="Collection order book"
        right={
          <Button variant="volt" onClick={() => setPostOpen(true)} disabled={!wallet}>
            Post offer{wallet ? "" : " · connect first"}
          </Button>
        }
      />

      {/* Collection cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {state.collections.map((c) => {
          const cOffers = state.offers.filter((o) => o.collection === c.slug && o.state === "Open");
          const liq = cOffers.reduce((s, o) => s + o.principal, 0);
          const best = cOffers.length ? Math.min(...cOffers.map((o) => o.apyBps)) : null;
          const liveN = state.loans.filter((l) => l.collection === c.slug && ["Active", "Extended", "Defaulted"].includes(effectiveState(l, now))).length;
          return (
            <button
              key={c.slug}
              onClick={() => setSlug(c.slug)}
              className={cn("panel p-4 text-left transition-all hover:border-volt/40", slug === c.slug && "border-volt shadow-volt")}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-medium text-volt">{c.slug}</span>
                <GateChip gate={c.gateMin} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{c.name}</div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Mini label="Open" value={usd(liq)} />
                <Mini label="Best APY" value={best === null ? "—" : pct(best)} />
                <Mini label="Live" value={liveN} />
              </div>
              <div className="mt-3 flex gap-2 font-mono text-[10px] text-muted-foreground">
                <span>LTV cap {pct(c.ltvBps)}</span>·<span>{days(c.termSeconds)} default</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Order book */}
      <div className="panel mb-8">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <div className="font-mono text-sm text-volt">{col.slug}</div>
            <div className="text-xs text-muted-foreground">{col.description}</div>
          </div>
          <div className="text-xs text-muted-foreground">{offers.length} open · sorted by APY (best for borrowers first)</div>
        </div>
        <OfferTable
          offers={offers}
          action={(o) =>
            o.lender === wallet ? (
              <Button size="sm" variant="ghost" onClick={() => h.cancelOffer(o.id)}>Cancel</Button>
            ) : (
              <span className="font-mono text-[10px] text-muted-foreground">open</span>
            )
          }
          emptyText="No open offers here. Post one — the seeded AV projects are waiting."
        />
        {col.gateMin <= 3 && <CompareChip apyBps={col.defaultApyBps} termDays={Math.round(col.termSeconds / 86400)} className="m-4" />}
      </div>

      {/* My positions */}
      {!wallet ? (
        <Empty title="No wallet connected" body="Use Connect → Load demo lender in the header to see your offers, active loans and the defaulted seed loan ready to foreclose." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div>
            <SectionHead eyebrow={role === "lender" ? "Demo lender" : "Your wallet"} title="Active loans you funded" />
            {myLoans.length === 0 ? (
              <Empty title="No active loans" body="Post an offer, then switch to the demo AV and accept it from /borrow." />
            ) : (
              <div className="space-y-3">
                {myLoans.map((l) => {
                  const st = effectiveState(l, now);
                  const p = state.projects.find((x) => x.id === l.projectId);
                  const canForeclose = isPastGrace(l, now) && (st === "Defaulted" || st === "Active" || st === "Extended");
                  const graceLeft = l.expiresAt + GRACE_SECONDS - now;
                  return (
                    <div key={l.id} className={cn("panel p-4", st === "Defaulted" && "border-destructive/50")}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <ProjectLink id={l.projectId}>{p?.name ?? l.projectId}</ProjectLink>
                          <div className="font-mono text-[11px] text-muted-foreground">{l.collection} · <LoanLink id={l.id}>{l.id}</LoanLink></div>
                        </div>
                        <Pill state={st} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Stat label="Principal" value={usdc(l.principal, 0)} />
                        <Stat label="APY" value={pct(l.apyBps)} sub={`${days(l.termSeconds)} term`} />
                        <Stat label="Accrued" value={usdc(interestAccrued(l, now))} sub={`of ${usdc(totalDue(l) - l.principal)} due`} />
                        <Stat
                          label={st === "Defaulted" ? (graceLeft > 0 ? "Grace ends" : "Past grace") : "Expires"}
                          value={st === "Defaulted" ? (graceLeft > 0 ? countdown(graceLeft) : "foreclosable") : countdown(l.expiresAt - now)}
                          accent={st === "Defaulted"}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[11px] text-muted-foreground">
                          Escrow holds <span className="num text-foreground">{usdc(l.escrowBalance)}</span> from takeout payments.
                        </div>
                        {canForeclose && (
                          <Button variant="destructive" size="sm" onClick={() => h.foreclose(l.id)}>
                            Foreclose → take note + escrow
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="space-y-6">
            <div>
              <SectionHead eyebrow="Open" title="Your open offers" />
              <div className="panel">
                <OfferTable offers={myOffers} action={(o) => <Button size="sm" variant="ghost" onClick={() => h.cancelOffer(o.id)}>Cancel</Button>} emptyText="No open offers from this wallet." />
              </div>
            </div>
            {myClosed.length > 0 && (
              <div>
                <SectionHead eyebrow="Closed" title="Settled" />
                <div className="panel divide-y divide-border">
                  {myClosed.map((l) => (
                    <div key={l.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <LoanLink id={l.id}>{state.projects.find((p) => p.id === l.projectId)?.name ?? l.id}</LoanLink>
                      <div className="flex items-center gap-3">
                        <span className="num text-xs text-muted-foreground">{usdc(l.principal, 0)} + {usdc(l.interestPaid)} int.</span>
                        <Pill state={effectiveState(l, now)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <PostOfferDialog open={postOpen} onOpenChange={setPostOpen} collection={col} collections={state.collections} />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="num text-sm">{value}</div>
    </div>
  );
}

function PostOfferDialog({ open, onOpenChange, collection, collections }: { open: boolean; onOpenChange: (v: boolean) => void; collection: Collection; collections: Collection[] }) {
  const h = useHelio();
  const [slug, setSlug] = useState(collection.slug);
  const col: Collection = collections.find((c) => c.slug === slug) ?? collection;
  const [gate, setGate] = useState<Gate>(3);
  const grid = OFFER_GRID.find((g) => g.gate === gate) ?? OFFER_GRID[1];
  const [principal, setPrincipal] = useState(5000);
  const [apy, setApy] = useState(grid.apyBps / 100);
  const [orig, setOrig] = useState(grid.originationBps / 100);
  const [term, setTerm] = useState<number>(grid.termDays);

  const pickGate = (g: Gate) => {
    const row = OFFER_GRID.find((x) => x.gate === g) ?? OFFER_GRID[1];
    setGate(g);
    setApy(row.apyBps / 100);
    setOrig(row.originationBps / 100);
    setTerm(row.termDays);
  };
  const interest = (principal * apy * term) / (100 * 365);

  const submit = () => {
    const o = h.postOffer({
      collection: col.slug,
      principal,
      apyBps: Math.round(apy * 100),
      originationBps: Math.round(orig * 100),
      termSeconds: term * 86400,
      minGate: gate,
      offerTtlSeconds: 30 * 86400,
    });
    if (o) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Post a USDC offer</DialogTitle>
          <DialogDescription>USDC moves from your wallet into the offer vault now. Cancel any time before it is taken. Balance: <span className="num text-foreground">{usdc(h.balance, 0)}</span></DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-sm border border-border p-1 sm:grid-cols-4">
            {collections.map((c) => (
              <button key={c.slug} onClick={() => setSlug(c.slug)} className={cn("rounded-sm px-2 py-1.5 font-mono text-xs", slug === c.slug ? "bg-volt text-volt-foreground" : "hover:bg-secondary")}>{c.slug}</button>
            ))}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Minimum gate (loads the default grid)</Label>
            <div className="grid grid-cols-3 gap-1 rounded-sm border border-border p-1">
              {OFFER_GRID.map((g) => (
                <button key={g.gate} disabled={g.gate < col.gateMin} onClick={() => pickGate(g.gate as Gate)} className={cn("rounded-sm px-2 py-1.5 text-left disabled:opacity-30", gate === g.gate ? "bg-volt text-volt-foreground" : "hover:bg-secondary")}>
                  <div className="font-mono text-[10px] uppercase">{g.gateLabel}</div>
                  <div className="num text-xs">{g.apyBps / 100}% · {g.termDays}d</div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <F label="Principal USDC"><Input type="number" className="num" value={principal} min={100} step={100} onChange={(e) => setPrincipal(Number(e.target.value))} /></F>
            <F label="APY %"><Input type="number" className="num" value={apy} step={0.5} onChange={(e) => setApy(Number(e.target.value))} /></F>
            <F label="Origination %"><Input type="number" className="num" value={orig} step={0.25} onChange={(e) => setOrig(Number(e.target.value))} /></F>
            <F label="Term days"><Input type="number" className="num" value={term} step={1} onChange={(e) => setTerm(Number(e.target.value))} /></F>
          </div>
          <div className="rounded-sm bg-surface p-3 text-xs text-muted-foreground">
            If taken for the full term: interest <span className="num text-foreground">{usdc(interest)}</span> gross → <span className="num text-volt">{usdc(interest * 0.9)}</span> net of 10% protocol fee, plus origination <span className="num text-foreground">{usdc((principal * orig) / 100)}</span> to treasury at close.
            Borrowers must be at {grid.gateLabel} or later; principal capped at {pct(Math.min(col.ltvBps, grid.ltvBps))} of takeout.
          </div>
          <CompareChip apyBps={Math.round(apy * 100)} termDays={term} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="volt" onClick={submit} disabled={principal <= 0 || principal > h.balance}>Deposit {usd(principal)} &amp; post</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
