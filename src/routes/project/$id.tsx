import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, Stat, fmt, usd } from "@/components/hash/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AsicRow } from "@/components/hash/AsicRow";
import { capacityTh } from "@/lib/hash/asics";
import { HOLDER_SHARE, SATS_PER_TH_DAY, UNBOND_FEE, curveFor, hashOut, price, usdBack } from "@/lib/hash/curve";
import { ME, freeTh, statusLabel, useHash } from "@/lib/hash/store";

export const Route = createFileRoute("/project/$id")({
  head: () => ({
    meta: [
      { title: "Solar project — HELIO" },
      { name: "description", content: "Bond USDC into this solar mining project and mint HASH." },
      { property: "og:title", content: "Solar project — HELIO" },
      { property: "og:description", content: "Bond USDC into this solar mining project and mint HASH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectPage,
  notFoundComponent: () => <p>Project not found.</p>,
});

function ProjectPage() {
  const { id } = Route.useParams();
  const { s, bond, unbond, advance } = useHash();
  const [amt, setAmt] = useState("100");
  const p = s.projects.find((q) => q.id === id);
  if (!p) throw notFound();

  const c = curveFor(p.raise, p.th);
  const n = Math.max(0, Number(amt) || 0);
  const mine = p.holders[ME] ?? 0;
  const bonding = p.status === "Bonding";

  // Price curve: 21 points from empty to full.
  const pts = Array.from({ length: 21 }, (_, i) => price(c, (p.raise * i) / 20));
  const start = price(c, 0);
  const max = price(c, p.raise);
  const path = pts.map((v, i) => `${i ? "L" : "M"}${i * 15},${100 - (v / max) * 95}`).join(" ");
  const nowX = (p.raised / p.raise) * 300;

  return (
    <div className="space-y-8">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Projects</Link>
      <div>
        <h1 className="font-display text-3xl font-semibold">{p.name} · {p.place}</h1>
        <p className="mt-2 text-muted-foreground">
          {p.solarKw} kW solar + {p.batteryKwh} kWh battery powering {p.th} TH of miners. Status: {statusLabel(p.status)}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Price now" value={usd(price(c, p.raised), 3)} sub={`Starts at ${usd(start, 3)} · ends at ${usd(max, 3)}`} />
        <Stat label="Bonded" value={`${usd(p.raised)} / ${usd(p.raise)}`} sub={<Bar value={p.raised / p.raise} />} />
        <Stat label="Your HASH" value={fmt(mine)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="eyebrow">Bonding curve — early buyers pay less</div>
          <svg viewBox="0 0 300 100" className="mt-4 h-48 w-full" preserveAspectRatio="none">
            <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <line x1={nowX} x2={nowX} y1="0" y2="100" stroke="var(--foreground)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>$0 bonded</span><span>Full: {usd(p.raise)}</span></div>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-card p-5">
          {bonding ? (
            <>
              <div className="eyebrow">Bond USDC</div>
              <Input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} />
              <div className="text-sm text-muted-foreground">
                You get ≈ <span className="num text-foreground">{fmt(hashOut(c, p.raised, Math.min(n, p.raise - p.raised)))}</span> HASH
              </div>
              <Button className="w-full" disabled={!n || n > s.usd} onClick={() => bond(p.id, n)}>
                {n > s.usd ? "Not enough USDC" : "Bond & mint HASH"}
              </Button>
              {mine > 0 && (
                <Button variant="outline" className="w-full" onClick={() => unbond(p.id)}>
                  Pull out {usd(usdBack(c, p.raised, mine) - UNBOND_FEE, 2)} (−${UNBOND_FEE} fee)
                </Button>
              )}
            </>
          ) : p.status === "Building" ? (
            <>
              <div className="eyebrow">Initialized – Awaiting ASIC deployment</div>
              <p className="text-sm text-muted-foreground">Curve filled. USDC is locked and the land and application process has started. Fill open power with miners below.</p>
              <Link to="/marketplace" search={{ project: p.id, sort: "efficiency" }} className="block"><Button className="w-full">Browse miners</Button></Link>
              <Button className="w-full" variant="secondary" onClick={() => advance(p.id)}>Test: switch it on</Button>
            </>
          ) : (
            <>
              <div className="eyebrow">Live</div>
              <p className="text-sm text-muted-foreground">Mining now. Its REC payments bought more miners for everyone.</p>
            </>
          )}
        </div>
      </div>

      <Capacity id={p.id} />
    </div>
  );
}

function Capacity({ id }: { id: string }) {
  const { s } = useHash();
  const p = s.projects.find((q) => q.id === id)!;
  const cap = capacityTh(p.solarKw);
  const asics = s.asics.filter((a) => a.projectId === id);
  const open = freeTh(s, p);
  const slot = (th: number) => `${Math.max(2, (th / cap) * 100)}%`;
  const live = p.status === "Live";
  const projected = cap - open;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold">Power capacity</h2>
        <span className="num text-sm text-muted-foreground">{fmt(cap - open, 1)} / {fmt(cap, 1)} TH used · {fmt(open, 1)} TH open</span>
      </div>
      <div className="flex h-10 w-full overflow-hidden rounded-sm border border-border bg-secondary">
        <div className={live ? "bg-primary" : "bg-foreground/60"} style={{ width: slot(p.th) }} title={`Base miners · ${p.th} TH`} />
        {asics.map((a) => (
          <div key={a.id} className={`border-l border-background ${a.status === "Live" ? "bg-primary" : a.status === "Deploying" ? "bg-foreground/60" : "bg-primary/30"}`} style={{ width: slot(a.th) }} title={`${a.th} TH · ${a.status}`} />
        ))}
        {open > 0 && (
          p.status === "Bonding"
            ? <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">{fmt(open, 1)} TH open after init</div>
            : <Link to="/marketplace" search={{ project: id, sort: "efficiency" }} className="flex flex-1 items-center justify-center border-l border-dashed border-primary text-xs font-medium text-primary hover:bg-primary/10">+ Fill {fmt(open, 1)} TH void</Link>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Projected {fmt(projected, 1)} TH · est. {fmt(projected * SATS_PER_TH_DAY * HOLDER_SHARE)} sats/day to HASH holders. Capacity = 150 TH per 8 kW of solar.
      </p>
      {asics.length > 0 && <div className="grid gap-3 md:grid-cols-2">{asics.map((a) => <AsicRow key={a.id} a={a} />)}</div>}
    </section>
  );
}
