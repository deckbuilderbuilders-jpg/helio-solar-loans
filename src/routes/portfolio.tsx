import { createFileRoute } from "@tanstack/react-router";
import { Stat, fmt } from "@/components/hash/Shell";
import { Button } from "@/components/ui/button";
import { usePool } from "@/lib/hash/usePool";
import { liveTh, myHash, satsPerDay, totalHash, useHash } from "@/lib/hash/store";

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
      <div className="flex flex-wrap gap-2">
        <Button onClick={claim} disabled={s.sats < 1}>Claim BTC</Button>
        <Button variant="secondary" onClick={() => mine(30)} disabled={!live}>Test: mine 30 days</Button>
        <Button variant="ghost" onClick={reset}>Reset test data</Button>
      </div>
    </div>
  );
}
