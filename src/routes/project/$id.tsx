import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, Stat, fmt, usd } from "@/components/hash/Shell";
import { StageTrack, TwoStage } from "@/components/hash/Stages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HASH_PER_TH, HOLDER_SHARE, SATS_PER_TH_DAY, UNBOND_FEE, curveFor, hashOut, price, usdBack } from "@/lib/hash/curve";
import { ME, useHash } from "@/lib/hash/store";

export const Route = createFileRoute("/project/$id")({
  head: () => ({
    meta: [
      { title: "Solar project — HELIO" },
      { name: "description", content: "Bond the project, then bond the miners. Mint HASH at each step." },
      { property: "og:title", content: "Solar project — HELIO" },
      { property: "og:description", content: "Bond the project, then bond the miners. Mint HASH at each step." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectPage,
  notFoundComponent: () => <p>Project not found.</p>,
});

function ProjectPage() {
  const { id } = Route.useParams();
  const { s, bond, unbond, bondAsic, unbondAsic, asicLiveNow } = useHash();
  const p = s.projects.find((q) => q.id === id);
  if (!p) throw notFound();
  const a = p.asic;

  return (
    <div className="space-y-8">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Projects</Link>
      <div className="space-y-3">
        <h1 className="font-display text-3xl font-semibold">{p.name} · {p.place}</h1>
        <p className="text-muted-foreground">{p.solarKw} kW solar + {p.batteryKwh} kWh battery. Bond the project first. Then bond the miners it will power.</p>
        <StageTrack p={p} />
      </div>
      <TwoStage p={p} />

      <Curve
        step="1" title="Project curve" what="Site startup: land, application and initial costs."
        raise={p.raise} raised={p.raised} th={p.th} mine={p.holders[ME] ?? 0} usdc={s.usd}
        open={p.status === "Bonding"}
        closedNote="Project finalized. USDC is locked and site work has started."
        onBond={(n) => bond(p.id, n)} onPull={() => unbond(p.id)}
      />

      <section className={`rounded-lg border-2 p-1 ${a.status === "Bonding" ? "border-primary" : "border-transparent"}`}>
        {a.status === "Bonding" && (
          <div className="px-4 pt-3 font-display text-xl font-semibold text-primary">Fund the miners →</div>
        )}
        <Curve
          step="2" title="ASIC curve — fund the miners"
          what={`Buys ${fmt(a.th, 1)} TH of miners for this site's solar + battery (150 TH per 8 kW). The DAO picks the models. Est. ${fmt(a.th * SATS_PER_TH_DAY * HOLDER_SHARE)} sats/day to HASH holders.`}
          raise={a.raise} raised={a.raised} th={a.th} mine={a.holders[ME] ?? 0} usdc={s.usd}
          open={a.status === "Bonding"}
          closedNote={
            a.status === "Closed" ? "Not open. Opens when the project curve reaches 100%."
              : a.status === "Funded" ? "Miners funded. Deploying to the site."
              : "Live. Mining now."
          }
          onBond={(n) => bondAsic(p.id, n)} onPull={() => unbondAsic(p.id)}
          extra={a.status === "Funded" ? <Button variant="secondary" className="w-full" onClick={() => asicLiveNow(p.id)}>Test: plug miners in</Button> : null}
        />
      </section>
    </div>
  );
}

function Curve(props: {
  step: string; title: string; what: string; raise: number; raised: number; th: number; mine: number; usdc: number;
  open: boolean; closedNote: string; onBond: (n: number) => void; onPull: () => void; extra?: React.ReactNode;
}) {
  const { raise, raised, th, mine, open } = props;
  const [amt, setAmt] = useState("100");
  const c = curveFor(raise, th);
  const n = Math.max(0, Number(amt) || 0);
  const start = price(c, 0);
  const end = price(c, raise);
  const avg = raise / (th * HASH_PER_TH);
  const mult = avg / price(c, raised); // early-buyer HASH multiplier vs average
  const pts = Array.from({ length: 21 }, (_, i) => price(c, (raise * i) / 20));
  const path = pts.map((v, i) => `${i ? "L" : "M"}${i * 15},${100 - (v / end) * 95}`).join(" ");
  const nowX = (raised / raise) * 300;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold"><span className="font-mono text-primary">0{props.step}</span> {props.title}</h2>
        <span className="num text-sm">{usd(raised)} / {usd(raise)}</span>
      </div>
      <p className="mt-1 text-muted-foreground">{props.what}</p>
      <div className="mt-3"><Bar value={raised / raise} /></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Price now" value={usd(price(c, raised), 4)} sub={`${usd(start, 4)} → ${usd(end, 4)} per HASH`} />
        <Stat label="Early-buyer bonus" value={`${mult.toFixed(2)}×`} sub="HASH per $ vs. average" />
        <Stat label="Your HASH" value={fmt(mine)} />
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <svg viewBox="0 0 300 100" className="h-36 w-full" preserveAspectRatio="none">
            <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <line x1={nowX} x2={nowX} y1="0" y2="100" stroke="var(--foreground)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>$0</span><span>Full: {usd(raise)}</span></div>
        </div>
        <div className="space-y-3">
          {open ? (
            <>
              <Input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} />
              <div className="text-sm text-muted-foreground">You get ≈ <span className="num text-foreground">{fmt(hashOut(c, raised, Math.min(n, raise - raised)))}</span> HASH</div>
              <Button className="w-full" disabled={!n || n > props.usdc} onClick={() => props.onBond(n)}>
                {n > props.usdc ? "Not enough USDC" : props.step === "1" ? "Bond project" : "Bond ASICs"}
              </Button>
              {mine > 0 && (
                <Button variant="outline" className="w-full" onClick={props.onPull}>
                  Pull out {usd(usdBack(c, raised, mine) - UNBOND_FEE, 2)} (−${UNBOND_FEE} fee)
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{props.closedNote}</p>
          )}
          {props.extra}
        </div>
      </div>
    </div>
  );
}
