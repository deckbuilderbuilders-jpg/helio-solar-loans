import { Link, createFileRoute } from "@tanstack/react-router";
import { Empty, NoteLink, Pill, SectionHead, Stat, pct, usd, usdc } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { lenderInterest, lenderPoints, noteStatus } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";
import { POOL_LABEL, fmtWatts, seasonWatts, type PoolKey } from "@/lib/helio/watts";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — HELIO" },
      { name: "description", content: "Your HELIO bridge-note positions, interest earned, points and roofs you created." },
      { property: "og:title", content: "Portfolio — HELIO" },
      { property: "og:description", content: "Positions, payout at takeout and HELIO Points." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  const { state, wallet, balance, now, connect } = useHelio();
  if (!wallet) {
    return <Empty title="No wallet connected" body="Load the demo lender to see positions and points." cta={<Button variant="volt" onClick={() => connect("investor")}>Load demo lender</Button>} />;
  }
  const positions = state.notes.filter((n) => (n.deposits[wallet] ?? 0) > 0 && !n.failed);
  const filling = positions.filter((n) => n.stage === 1);
  const locked = positions.filter((n) => n.stage >= 2 && n.stage <= 4);
  const repaid = positions.filter((n) => n.stage >= 5);
  const created = state.notes.filter((n) => n.creator === wallet);
  const sw = seasonWatts(state, now);
  const mine = sw.wallets.find((w) => w.wallet === wallet);
  const lockedDue = locked.reduce((s, n) => s + (n.deposits[wallet] ?? 0) + lenderInterest(n, wallet, now), 0);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="Wallet" value={usdc(balance, 0)} />
        <Stat label="Filling" value={usd(filling.reduce((s, n) => s + (n.deposits[wallet] ?? 0), 0))} sub="withdrawable, 2.5% fee" />
        <Stat label="Locked notes" value={usd(lockedDue)} sub="principal + interest so far" />
        <Stat label="Season WATTS" value={fmtWatts(mine?.total ?? 0)} sub={`${fmtWatts(mine?.vested ?? 0)} vested · ${fmtWatts(mine?.pending ?? 0)} pending`} accent />
      </div>

      <section>
        <SectionHead eyebrow="Season 0" title="WATTS by pool" right={<Link to="/points" className="text-xs text-volt">How WATTS work</Link>} />
        <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
          {(["completion", "capital", "origination", "installer", "referral"] as PoolKey[]).map((p) => (
            <Stat key={p} label={POOL_LABEL[p]} value={fmtWatts(mine?.pools[p] ?? 0)} />
          ))}
        </div>
      </section>

      <section>
        <SectionHead eyebrow="Bridge" title="Positions" />
        <div className="panel divide-y divide-border">
          {[...filling, ...locked, ...repaid].map((n) => (
            <div key={n.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <NoteLink id={n.id}>{n.name}</NoteLink>
              <span className="flex flex-wrap items-center gap-4">
                <span className="num">{usd(n.deposits[wallet] ?? 0)}</span>
                <span className="num text-volt">{pct(n.apr, 2)}</span>
                <span className="num text-muted-foreground">+{usd(lenderInterest(n, wallet, now), 2)} interest</span>
                <span className="num text-muted-foreground">{(lenderPoints(n, wallet) / Math.max(1, n.deposits[wallet] ?? 0)).toFixed(2)}x fill</span>
                {n.stage < 5 && <span className="num text-muted-foreground">≈{fmtWatts(((n.deposits[wallet] ?? 0) / Math.max(1, Object.values(n.deposits).reduce((a, b) => a + b, 0))) * (sw.noteCompletionEst[n.id] ?? 0))} WATTS if it repays</span>}
                <Pill state={noteStatus(n)} />
              </span>
            </div>
          ))}
          {positions.length === 0 && <div className="px-4 py-3 text-sm text-muted-foreground">No positions. <Link to="/projects" className="text-volt">See open notes</Link>.</div>}
        </div>
      </section>

      <section>
        <SectionHead eyebrow="Creator" title="Roofs you created" />
        <div className="panel divide-y divide-border">
          {created.map((n) => (
            <div key={n.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <NoteLink id={n.id}>{n.name}</NoteLink>
              <span className="flex items-center gap-4 text-xs text-muted-foreground">
                fee {usd(n.applicationFee)} · 5x cash {n.creatorPaid ? `paid ${usd(n.creatorPaid)}` : `${usd(n.applicationFee * 5)} at takeout`}
                <Pill state={noteStatus(n)} />
              </span>
            </div>
          ))}
          {created.length === 0 && <div className="px-4 py-3 text-sm text-muted-foreground">None yet. <Link to="/originate" className="text-volt">Import an application</Link>.</div>}
        </div>
      </section>
    </div>
  );
}
