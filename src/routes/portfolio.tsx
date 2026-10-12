import { createFileRoute, Link } from "@tanstack/react-router";
import { Stat, fmt } from "@/components/hash/Shell";
import { Button } from "@/components/ui/button";
import { usePool } from "@/lib/hash/usePool";
import { ME, liveTh, stageBadge, myHash, satsPerDay, totalHash, useHash } from "@/lib/hash/store";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "My HASH — HELIO" },
      { name: "description", content: "Your HASH, your share of the network, and the Bitcoin you've earned." },
      { property: "og:title", content: "My HASH — HELIO" },
      { property: "og:description", content: "Your HASH, your share of the network, and the Bitcoin you've earned." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  const { s, mine, claim, reset } = useHash();
  const live = myHash(s);
  const share = live / totalHash(s);
  const pending = myHash(s, false) - live;
  const { data: pool } = usePool();
  const mined24 = pool?.ok ? share * pool.sats24h * 0.8 : null;
  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-semibold">My HASH</h1>
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="HASH earning" value={fmt(live)} sub={pending > 0 ? `+${fmt(pending)} still bonding` : undefined} />
        <Stat label="Share of network" value={`${(share * 100).toFixed(3)}%`} sub={`≈ ${fmt(share * liveTh(s), 2)} TH`} />
        <Stat label="Sats per day" value={fmt(mined24 ?? satsPerDay(s))} sub={mined24 !== null ? "Live from pool, after 20% DAO cut" : "Estimate, after 20% DAO cut"} />
        <Stat label="Ready to claim" value={`${fmt(s.sats)} sats`} />
      </div>
      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Positions</h2>
        {s.projects.filter((p) => (p.holders[ME] ?? 0) + (p.asic.holders[ME] ?? 0) > 0).length === 0 && <p className="text-muted-foreground">No positions yet.</p>}
        {s.projects.filter((p) => (p.holders[ME] ?? 0) + (p.asic.holders[ME] ?? 0) > 0).map((p) => (
          <Link key={p.id} to="/project/$id" params={{ id: p.id }} className="grid gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary sm:grid-cols-[1fr_1fr_1fr]">
            <div><div className="font-semibold">{p.name}</div><div className="text-sm text-muted-foreground">{stageBadge(p)}</div></div>
            <div><div className="eyebrow">Project curve</div><div className="num">{fmt(p.holders[ME] ?? 0)} HASH · {Math.floor((p.raised / p.raise) * 100)}%</div></div>
            <div><div className="eyebrow">ASIC curve</div><div className="num">{p.asic.status === "Closed" ? "Not open" : `${fmt(p.asic.holders[ME] ?? 0)} HASH · ${Math.floor((p.asic.raised / p.asic.raise) * 100)}%`}</div></div>
          </Link>
        ))}
      </section>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border border-border bg-card px-5 py-4 text-sm">
        <span className="flex items-center gap-2 font-mono text-xs uppercase">
          <span className={`size-2 rounded-full ${pool?.ok ? "bg-volt animate-pulse" : "bg-muted-foreground"}`} />
          {pool?.ok ? (pool.online ? "Miner online" : "Miner offline") : "Pool not connected"}
        </span>
        {pool?.ok && <>
          <span>Live hashrate <b className="font-mono">{fmt(pool.hashrateTH, 2)} TH</b></span>
          <span>Mined all-time <b className="font-mono">{fmt(pool.satsTotal)} sats</b></span>
          <span className="text-muted-foreground">Updated {new Date(pool.updatedAt).toLocaleTimeString()}</span>
        </>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={claim} disabled={s.sats < 1}>Claim BTC</Button>
        <Button variant="secondary" onClick={() => mine(30)} disabled={!live}>Test: mine 30 days</Button>
        <Button variant="ghost" onClick={reset}>Reset test data</Button>
      </div>
    </div>
  );
}
