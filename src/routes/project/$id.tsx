import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EconomicsLine, EconomicsTable } from "@/components/helio/Economics";
import { StageTimeline } from "@/components/helio/GateTimeline";
import { Empty, Pill, Progress, Row, SectionHead, Stat, dateShort, pct, usd, usdc } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pointsForFill } from "@/lib/helio/auction";
import { payoutPerDollar, prebondWithdrawal } from "@/lib/helio/economics";
import { econOf, lenderDue, lenderInterest, lenderPoints, livePoints, lockupDays, noteStatus, raised, remaining, short, target } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";

export const Route = createFileRoute("/project/$id")({
  head: () => ({
    meta: [
      { title: "Bridge note — HELIO" },
      { name: "description", content: "Fixed APR, REC contract, rebates, factored tail and lenders for one Illinois solar + storage roof." },
      { property: "og:title", content: "Bridge note — HELIO" },
      { property: "og:description", content: "Underwriting, REC value and payout for one Illinois roof." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NoteDetail,
});

function NoteDetail() {
  const { id } = Route.useParams();
  const { state, now, wallet, balance, deposit, withdraw } = useHelio();
  const n = state.notes.find((x) => x.id === id);
  const [amt, setAmt] = useState("1000");

  if (!n) {
    return <Empty title="Note not found" body="This note isn't in the demo ledger. Reset the demo from the wallet menu." cta={<Button asChild variant="secondary"><Link to="/projects">All notes</Link></Button>} />;
  }
  const e = econOf(n);
  const open = n.stage === 1 && !n.failed;
  const r = n.stage >= 2 ? e.buildCost : raised(n);
  const mine = wallet ? n.deposits[wallet] ?? 0 : 0;
  const due = lenderDue(n, now);
  const amount = parseFloat(amt) || 0;
  const add = Math.min(amount, remaining(n));
  const tgt = target(n);
  const previewPts = open ? pointsForFill(tgt, raised(n) / tgt, (raised(n) + add) / tgt) : 0;
  const w = prebondWithdrawal(Math.min(amount, mine));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">{n.city} · {n.address} · created by {short(n.creator)}</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{n.name}</h1>
          <EconomicsLine n={n} className="mt-2 max-w-2xl" />
          {n.application?.fileHash && (
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Application {n.application.fileName} · sha256 {n.application.fileHash.slice(0, 16)}…{n.application.editedFields.length ? ` · edited: ${n.application.editedFields.join(", ")}` : ""}
            </p>
          )}
        </div>
        <Pill state={noteStatus(n)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel space-y-5 p-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="APR" value={pct(n.apr, 2)} sub={`fixed · $1 → $${payoutPerDollar(n.apr, 120).toFixed(3)} in 120d`} accent />
            <Stat label="Coverage" value={`${e.coverage.toFixed(2)}x`} sub={`${usd(e.totalCash)} cash at takeout`} />
            <Stat label={open ? "Points now" : "Note size"} value={open ? `${livePoints(n).toFixed(2)}x` : usd(e.buildCost)} sub={open ? "2x empty → 1x full" : `${n.kwDc} kW + ${n.batteryKwh} kWh`} />
            <Stat label="Lockup" value={`${lockupDays(n, now)}d`} sub={n.fundedAt ? `funded ${dateShort(n.fundedAt)}` : "90–120 days"} />
          </div>
          <div className="space-y-1.5">
            <Progress value={r} total={e.buildCost} />
            <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
              <span className="text-foreground">{usd(r)} funded of {usd(e.buildCost)}</span>
              <span>{usd(remaining(n))} left</span>
            </div>
          </div>
          {n.stage >= 2 && !n.failed && (
            <div className="grid gap-x-6 md:grid-cols-2">
              <Row label="Lender principal" value={usd(due.principal)} />
              <Row label="Interest accrued" sub="from each deposit" value={usd(due.interest)} />
              {n.stage >= 5 && <Row label="Repaid at takeout" value={usd(n.lendersRepaid)} />}
              {n.stage >= 5 && <Row label="REC tail factored" value={usd(n.factorProceeds)} />}
              {n.stage >= 5 && <Row label="Creator 5x cash" value={usd(n.creatorPaid)} />}
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
                Wallet {usdc(balance, 0)} · in note {usdc(mine, 0)} · {pct(n.apr, 2)} APR from the day you deposit · 120 days ≈ {usd(add * n.apr * (120 / 365), 2)} interest · +{Math.round(previewPts).toLocaleString()} points
              </div>
              <div className="flex gap-2">
                <Button variant="volt" className="flex-1" disabled={!wallet || amount <= 0} onClick={() => deposit(n.id, amount)}>Deposit</Button>
                <Button variant="secondary" className="flex-1" disabled={!wallet || mine <= 0} onClick={() => withdraw(n.id, Math.min(amount, mine))}>Withdraw</Button>
              </div>
              {mine > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Withdrawing {usd(Math.min(amount, mine))} returns {usd(w.refund, 2)} and gives up points in proportion. 2.5% fee: {usd(w.toStayers, 2)} to lenders who stay, {usd(w.toProtocol, 2)} protocol.
                </p>
              )}
              {!wallet && <p className="text-xs text-warning">Connect a wallet from the header.</p>}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {n.failed
                ? "This note didn't fill. Lenders were refunded; the creator's fee was lost."
                : n.stage >= 5
                  ? "Repaid in full. The rebates, first REC payment and the factored REC tail settled this note."
                  : "Principal is locked until the Ameren rebates and the first REC payment land. The REC tail is sold at 65% the same day."}
            </p>
          )}
          {wallet && mine > 0 && (
            <>
              <Row label="Your interest so far" value={usd(lenderInterest(n, wallet, now), 2)} />
              <Row label="Your points" value={Math.round(lenderPoints(n, wallet)).toLocaleString()} />
            </>
          )}
          {n.exitBonus[wallet ?? ""] ? <Row label="Your exit-fee bonus" value={usd(n.exitBonus[wallet!] ?? 0, 2)} /> : null}
        </div>
      </div>

      <section>
        <SectionHead eyebrow="Underwriting" title="Where every dollar comes from" />
        <div className="panel p-5">
          <EconomicsTable e={e} days={n.fundedAt ? lockupDays(n, now) : 120} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section>
          <SectionHead eyebrow="Lifecycle" title="Stages" />
          <div className="panel p-5"><StageTimeline stage={n.stage} failed={n.failed} /></div>
        </section>
        <section className="space-y-6">
          <div>
            <SectionHead eyebrow="Book" title="Lenders" />
            <div className="panel divide-y divide-border">
              {Object.entries(n.deposits).map(([who, v]) => (
                <div key={who} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="font-mono">{short(who)}{who === wallet && " (you)"}</span>
                  <span className="flex gap-4">
                    <span className="num text-muted-foreground">{Math.round(lenderPoints(n, who)).toLocaleString()} pts</span>
                    <span className="num">{usd(v)}</span>
                  </span>
                </div>
              ))}
              {Object.keys(n.deposits).length === 0 && <div className="px-4 py-3 text-sm text-muted-foreground">No lenders yet. The first dollar earns 2x points.</div>}
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
