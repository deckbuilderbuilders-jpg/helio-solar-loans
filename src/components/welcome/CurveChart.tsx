import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { curveFor, hashOut, price, HASH_PER_TH, HOLDER_SHARE, SATS_PER_TH_DAY } from "@/lib/hash/curve";
import { Ticker } from "./Ticker";

const RAISE = 100_000;
const TH = 50;
const W = 600;
const H = 260;

export function CurveChart() {
  const c = useMemo(() => curveFor(RAISE, TH), []);
  const [fill, setFill] = useState(10);
  const [usd, setUsd] = useState(1000);
  const raised = (fill / 100) * RAISE;
  const amt = Math.min(usd, RAISE - raised);
  const hash = hashOut(c, raised, amt);
  const th = hash / HASH_PER_TH;
  const sats = th * SATS_PER_TH_DAY * HOLDER_SHARE;
  const per = (f: number) => hashOut(c, f * RAISE, 100) / 100;
  const early = per(0.1) / per(0.9);

  const pMax = price(c, RAISE);
  const y = (r: number) => H - 10 - (price(c, r) / pMax) * (H - 30);
  const x = (r: number) => (r / RAISE) * W;
  const line = Array.from({ length: 61 }, (_, i) => `${i ? "L" : "M"}${x((i / 60) * RAISE)},${y((i / 60) * RAISE)}`).join(" ");
  const seg = Array.from({ length: 21 }, (_, i) => raised + (i / 20) * amt);
  const area = `M${x(raised)},${H} ${seg.map((r) => `L${x(r)},${y(r)}`).join(" ")} L${x(raised + amt)},${H} Z`;

  return (
    <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border lg:grid-cols-[1.6fr_1fr]">
      <div className="bg-card p-6 md:p-10">
        <div className="flex items-baseline justify-between">
          <div className="eyebrow">HASH price · example $100k project</div>
          <div className="font-mono text-sm tabular-nums">${price(c, raised).toFixed(3)}</div>
        </div>
        <div className="relative mt-6">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
            {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={g * W} x2={g * W} y1={0} y2={H} className="stroke-border" />)}
            <line x1={0} x2={W} y1={H} y2={H} className="stroke-foreground/30" />
            <motion.path d={area} className="fill-volt/25" animate={{ d: area }} transition={{ type: "spring", stiffness: 200, damping: 26 }} />
            <motion.path d={line} className="fill-none stroke-foreground" strokeWidth={2.5} initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }} />
            <motion.circle r={8} className="fill-volt stroke-background" strokeWidth={3} animate={{ cx: x(raised), cy: y(raised) }} transition={{ type: "spring", stiffness: 300, damping: 24 }} />
          </svg>
          <input aria-label="How full the project already is" type="range" min={0} max={95} value={fill} onChange={(e) => setFill(+e.target.value)} className="absolute inset-0 size-full cursor-ew-resize opacity-0" />
        </div>
        <div className="mt-3 flex justify-between font-mono text-xs text-muted-foreground">
          <span>0% bonded</span><span className="text-foreground">You are here · {fill}% bonded — drag the chart</span><span>100%</span>
        </div>
        <p className="mt-6 border-t border-border pt-4 font-display text-xl">
          Bond at 10% full: <span className="text-volt">{early.toFixed(1)}× more HASH</span> than at 90%.
        </p>
      </div>

      <div className="flex flex-col bg-card p-6 md:p-10">
        <div className="eyebrow">You bond</div>
        <label className="mt-2 flex items-baseline gap-1 font-display text-6xl font-semibold tracking-tight">
          $<input type="number" min={0} value={usd} onChange={(e) => setUsd(Math.max(0, +e.target.value))} className="w-full bg-transparent tabular-nums outline-none" aria-label="Amount in USDC" />
        </label>
        <input type="range" min={50} max={10000} step={50} value={usd} onChange={(e) => setUsd(+e.target.value)} className="mt-4 w-full accent-[var(--volt)]" aria-label="Amount slider" />
        <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-6 pt-10">
          <S k="HASH you get"><Ticker value={Math.round(hash)} /></S>
          <S k="Hashrate you own"><Ticker value={th} decimals={2} /> TH</S>
          <S k="Est. sats / day"><Ticker value={Math.round(sats)} /></S>
          <S k="Your share of BTC">80%</S>
        </dl>
        <p className="mt-6 text-xs text-muted-foreground">Example project adding {TH} TH. Estimate uses {SATS_PER_TH_DAY} sats/TH/day.</p>
      </div>
    </div>
  );
}

function S({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{k}</dt>
      <dd className="mt-1 font-mono text-2xl tabular-nums">{children}</dd>
    </div>
  );
}
