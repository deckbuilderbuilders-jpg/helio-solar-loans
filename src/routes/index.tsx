import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, Stat, fmt, usd } from "@/components/hash/Shell";
import { curveFor, price } from "@/lib/hash/curve";
import { liveTh, statusLabel, totalHash, useHash } from "@/lib/hash/store";
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
            const c = curveFor(p.raise, p.th);
            return (
              <Link key={p.id} to="/project/$id" params={{ id: p.id }} className="block rounded-lg border border-border bg-card p-5 shadow-card transition hover:border-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-lg font-semibold">{p.name}</div>
                    <div className="text-sm text-muted-foreground">{p.place}</div>
                  </div>
                  <span className="rounded-sm border border-border px-2 py-0.5 font-mono text-xs uppercase">{statusLabel(p.status)}</span>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  {p.solarKw} kW solar · {p.batteryKwh} kWh battery · +{p.th} TH
                </div>
                <div className="mt-4"><Bar value={p.raised / p.raise} /></div>
                <div className="num mt-2 flex justify-between text-sm">
                  <span>{usd(p.raised)} / {usd(p.raise)}</span>
                  <span>{usd(price(c, p.raised), 3)} per HASH</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold">How it works</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-4">
          {[
            ["Bond", "Put USDC into a project. Early buyers get more HASH."],
            ["Build", "Once full, we buy the solar, battery and miners and install them."],
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
        <p className="mt-4 text-sm text-muted-foreground">Changed your mind before a project fills? Pull your USDC for a $2.50 fee.</p>
      </section>
    </div>
  );
}
