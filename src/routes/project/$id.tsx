import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EconomicsLine, EconomicsTable } from "@/components/helio/Economics";
import { StageTimeline } from "@/components/helio/GateTimeline";
import { Empty, Pill, Progress, Row, SectionHead, Stat, dateShort, pct, usd, usdc } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APR_CAP, AUCTION_HOURS } from "@/lib/helio/auction";
import { prebondWithdrawal } from "@/lib/helio/economics";
import { econOf, lenderDue, liveApr, liveWeight, lockupDays, nftClaimable, noteStatus, raised, remaining, short } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";

export const Route = createFileRoute("/project/$id")({
  head: () => ({
    meta: [
      { title: "Bridge note — HELIO" },
      { name: "description", content: "Live APR, build cost, Ameren + Illinois Shines takeout, lenders and Yield NFTs for one Illinois solar + storage roof." },
      { property: "og:title", content: "Bridge note — HELIO" },
      { property: "og:description", content: "Underwriting, auction and tail for one Illinois roof." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NoteDetail,
});

function NoteDetail() {
  const { id } = Route.useParams();
  const { state, now, wallet, balance, deposit, withdraw, claimNft } = useHelio();
  const n = state.notes.find((x) => x.id === id);
  const [amt, setAmt] = useState("1000");

  if (!n) {
    return <Empty title="Note not found" body="This note isn't in the demo ledger. Reset the demo from the wallet menu." cta={<Button asChild variant="secondary"><Link to="/projects">All notes</Link></Button>} />;
  }
  const e = econOf(n);
  const apr = liveApr(n, now);
  const open = n.stage === 1 && !n.failed;
  const r = n.stage >= 2 ? e.buildCost : raised(n);
  const mine = wallet ? n.deposits[wallet] ?? 0 : 0;
  const hoursLeft = Math.max(0, AUCTION_HOURS - (now - n.openedAt) / 3600);
  const due = lenderDue(n, now);
  const nfts = state.nfts.filter((x) => x.noteId === n.id);
  const amount = parseFloat(amt) || 0;
  const w = prebondWithdrawal(Math.min(amount, mine));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">{n.city} · {n.address} · created by {short(n.creator)}</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{n.name}</h1>
          <EconomicsLine n={n} className="mt-2 max-w-2xl" />
        </div>
        <Pill state={noteStatus(n)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel space-y-5 p-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label={open ? "Live APR" : "Clearing APR"} value={pct(apr, 2)} sub={open ? `cap ${pct(APR_CAP, 0)} · tail weight ${liveWeight(n, now).toFixed(2)}x` : "top of book"} accent />
            <Stat label="Note size" value={usd(e.buildCost)} sub={`${n.kwDc} kW + ${n.batteryKwh} kWh`} />
            <Stat label="Takeout" value={usd(e.takeout)} sub={`${e.takeoutCoverage.toFixed(2)}x build`} />
            <Stat label="Lockup" value={`${lockupDays(n, now)}d`} sub={n.fundedAt ? `funded ${dateShort(n.fundedAt)}` : "90–120 days"} />
          </div>
          <div className="space-y-1.5">
            <Progress value={r} total={e.buildCost} />
            <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
              <span className="text-foreground">{usd(r)} funded</span>
              <span>{usd(remaining(n))} left</span>
            </div>
          </div>
          {n.stage >= 2 && !n.failed && (
            <div className="grid gap-x-6 md:grid-cols-2">
              <Row label="Lender principal" value={usd(due.principal)} />
              <Row label={`Interest (${lockupDays(n, now)}d)`} value={usd(due.interest)} />
              {n.stage >= 5 && <Row label="Repaid at takeout" value={usd(n.lendersRepaid)} />}
              {n.stage >= 5 && <Row label="Creator 3x cash" value={usd(n.creatorPaid)} />}
              {n.stage >= 5 && <Row label={`Tail paid (${n.tailQuarters}/24 quarters)`} value={usd(n.tailReceived)} />}
              {n.dayOne !== null && <Row label="Installer" sub={n.dayOne ? "one-day install bonus earned" : "no day-one bonus"} value={usd(e.installerBase + (n.dayOne ? e.installerDayOneBonus : 0) + n.installerEarned)} />}
            </div>
          )}
        </div>

        <div className="panel space-y-4 p-5">
          <div className="eyebrow">{open ? "Lend into this roof" : "Position"}</div>
          {open ? (
            <>
              <Input type="number" min={1} value={amt} onChange={(ev) => setAmt(ev.target.value)} aria-label="Amount in USDC" />
              <div className="text-xs text-muted-foreground">
                Wallet {usdc(balance, 0)} · in note {usdc(mine, 0)} · at {pct(apr, 2)} + {liveWeight(n, now).toFixed(2)}x tail weight · 90 days ≈ {usd(Math.min(amount, remaining(n)) * apr * (90 / 365), 2)} interest if it cleared now
              </div>
              {e.takeout - e.buildCost - e.buildCost * apr * (120 / 365) - e.creatorCashBack < 0 && (
                <div className="text-[11px] text-muted-foreground">
                  At this APR and a 120-day lockup, the 5% collateral hold leaves part of the creator's 3x cash to be paid from the first REC-tail quarters. Lenders are still paid first, in full.
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="volt" className="flex-1" disabled={!wallet || amount <= 0} onClick={() => deposit(n.id, amount)}>Deposit</Button>
                <Button variant="secondary" className="flex-1" disabled={!wallet || mine <= 0} onClick={() => withdraw(n.id, Math.min(amount, mine))}>Withdraw</Button>
              </div>
              {mine > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Withdrawing {usd(Math.min(amount, mine))} returns {usd(w.refund, 2)}. 2.5% fee: {usd(w.toStayers, 2)} to lenders who stay, {usd(w.toProtocol, 2)} protocol.
                </p>
              )}
              {!wallet && <p className="text-xs text-warning">Connect a wallet from the header.</p>}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {n.failed ? "This auction didn't fill. Lenders were refunded; the creator's fee was lost." : "Principal is locked until the Ameren rebates and the first REC payment land. Yield NFTs below carry the tail."}
            </p>
          )}
          {n.exitBonus[wallet ?? ""] ? <Row label="Your exit-fee bonus" value={usd(n.exitBonus[wallet!] ?? 0, 2)} /> : null}
        </div>
      </div>

      <section>
        <SectionHead eyebrow="Underwriting" title="Where every dollar comes from" />
        <div className="panel p-5">
          <EconomicsTable e={e} apr={apr} days={lockupDays(n, now)} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section>
          <SectionHead eyebrow="Lifecycle" title="Stages" />
          <div className="panel p-5"><StageTimeline stage={n.stage} failed={n.failed} /></div>
        </section>
        <section className="space-y-6">
          <div>
            <SectionHead eyebrow={open ? "Auction book" : "Yield NFTs"} title={open ? "Lenders" : "Tail holders"} />
            <div className="panel divide-y divide-border">
              {open
                ? Object.entries(n.deposits).map(([who, v]) => (
                    <div key={who} className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="font-mono">{short(who)}{who === wallet && " (you)"}</span>
                      <span className="num">{usd(v)}</span>
                    </div>
                  ))
                : nfts.map((x) => {
                    const c = nftClaimable(n, x);
                    return (
                      <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                        <span className="font-mono">
                          {x.id} · {short(x.owner)}{x.owner === wallet && " (you)"}
                          <span className="ml-2 text-[11px] text-muted-foreground">{x.kind === "creator" ? "creator 2x" : "lender"} · {pct(x.weight / n.totalWeight, 1)}</span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="num text-muted-foreground">{usd(c, 2)} claimable</span>
                          {x.owner === wallet && c > 0.005 && <Button size="sm" variant="volt" onClick={() => claimNft(x.id)}>Claim</Button>}
                        </span>
                      </div>
                    );
                  })}
              {open && Object.keys(n.deposits).length === 0 && <div className="px-4 py-3 text-sm text-muted-foreground">No lenders yet. First in gets the lowest rate risk-free exit… at 2.5%.</div>}
            </div>
          </div>
          <div>
            <SectionHead eyebrow="On-chain log" title="Activity" />
            <div className="panel max-h-72 divide-y divide-border overflow-auto">
              {state.log.filter((l) => l.detail.includes(n.name) || l.detail.includes(n.id)).map((l) => (
                <div key={l.id} className="px-4 py-2 text-xs">
                  <span className="font-mono text-volt">{l.ix}</span> <span className="text-muted-foreground">{dateShort(l.at)}</span>
                  <div>{l.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
