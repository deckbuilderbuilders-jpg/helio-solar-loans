import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, Stat, fmt, usd } from "@/components/hash/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UNBOND_FEE, curveFor, hashOut, price, usdBack } from "@/lib/hash/curve";
import { ME, useHash } from "@/lib/hash/store";

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
  const max = pts[20];
  const path = pts.map((v, i) => `${i ? "L" : "M"}${i * 15},${100 - (v / max) * 95}`).join(" ");
  const nowX = (p.raised / p.raise) * 300;

  return (
    <div className="space-y-8">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Projects</Link>
      <div>
        <h1 className="font-display text-3xl font-semibold">{p.name} · {p.place}</h1>
        <p className="mt-2 text-muted-foreground">
          {p.solarKw} kW solar + {p.batteryKwh} kWh battery powering {p.th} TH of miners. Status: {p.status}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Price now" value={usd(price(c, p.raised), 3)} sub={`Starts at ${usd(pts[0], 3)} · ends at ${usd(max, 3)}`} />
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
              <div className="eyebrow">Fully bonded</div>
              <p className="text-sm text-muted-foreground">We're installing the solar and miners. HASH is locked in.</p>
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
    </div>
  );
}
