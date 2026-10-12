import { createFileRoute, Link } from "@tanstack/react-router";
import { Stat, fmt } from "@/components/hash/Shell";
import { Badge, TwoStage } from "@/components/hash/Stages";
import { liveTh, stageBadge, totalHash, useHash } from "@/lib/hash/store";
import { usePool } from "@/lib/hash/usePool";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HELIO — Fund solar. Earn Bitcoin." },
      { name: "description", content: "Bond USDC into a solar project. Get HASH. Earn 80% of the Bitcoin our solar miners make." },
      { property: "og:title", content: "HELIO — Fund solar. Earn Bitcoin." },
      { property: "og:description", content: "Bond USDC into a solar project. Get HASH. Earn 80% of the Bitcoin our solar miners make." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  const { s } = useHash();
  const { data: pool } = usePool();
  const poolTh = pool?.ok ? pool.hashrateTH : 0;
  return (
    <div className="space-y-12">
      <section className="max-w-2xl">
        <h1 className="font-display text-4xl font-semibold md:text-5xl">Fund solar. Earn Bitcoin.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Bond USDC into a solar project. You get HASH. HASH earns 80% of the Bitcoin our solar miners make.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Network hashrate" value={`${fmt(liveTh(s) + poolTh)} TH`} sub={pool?.ok ? `Live from pool · ${fmt(pool.sats24h)} sats in 24h` : "Grows with every project"} />
        <Stat label="HASH supply" value={fmt(totalHash(s))} sub="Minted only when projects bond" />
        <Stat label="Bitcoin split" value="80 / 20" sub="Holders / DAO" />
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold">Projects</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {s.projects.map((p) => {
            return (
              <Link key={p.id} to="/project/$id" params={{ id: p.id }} className="block rounded-lg border border-border bg-card p-5 shadow-card transition hover:border-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-lg font-semibold">{p.name}</div>
                    <div className="text-sm text-muted-foreground">{p.place}</div>
                  </div>
                  <Badge on>{stageBadge(p)}</Badge>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  {p.solarKw} kW solar · {p.batteryKwh} kWh battery · {fmt(p.asic.th, 1)} TH planned
                </div>
                <div className="mt-4"><TwoStage p={p} /></div>
                {p.asic.status === "Bonding" && <div className="mt-3 font-medium text-primary">Fund the miners →</div>}
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold">How it works</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-4">
          {[
            ["Bond the project", "Small curve for land and the application. Early buyers get more HASH."],
            ["Bond the ASICs", "Once the project fills, a miner curve opens. It buys the miners."],
            ["Mine", "The sun powers the miners. 80% of the Bitcoin goes to HASH holders."],
            ["Grow", "State solar payments buy more miners. Your HASH earns more."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-lg border border-border bg-card p-5">
              <div className="font-mono text-xs text-primary">0{i + 1}</div>
              <div className="mt-1 font-display font-semibold">{t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">Changed your mind before a curve fills? Pull your USDC for a $2.50 fee.</p>
      </section>
    </div>
  );
}
