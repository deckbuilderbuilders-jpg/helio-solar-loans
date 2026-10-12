import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import hero from "@/assets/welcome-hero.jpg";
import { liveTh, useHash } from "@/lib/hash/store";
import { usePool } from "@/lib/hash/usePool";
import { Ticker } from "./Ticker";
import { Arrow } from "./Arrow";

const FLOW = "M1862,690 C1500,420 1050,380 760,505 L1080,770 L1290,790";

export function Hero() {
  const reduce = useReducedMotion();
  const { s } = useHash();
  const { data: pool } = usePool();
  const live = !!pool?.ok;
  const th = liveTh(s) + (live ? pool!.hashrateTH : 0);
  const words = ["Sunlight", "in.", "Bitcoin", "out."];

  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden border-b border-border">
      <img src={hero} alt="Solar roof with a quiet miner cabinet beside the house" width={1920} height={1088} className="absolute inset-0 -z-20 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/70 to-transparent md:via-background/40" />

      {/* energy flow drawn over the photo */}
      <svg viewBox="0 0 1920 1088" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 -z-10 hidden size-full md:block" aria-hidden>
        <path d={FLOW} className="fill-none stroke-foreground/40" strokeWidth={1.5} strokeDasharray="2 8" />
        <path d={FLOW} className="flow-dash fill-none stroke-volt" strokeWidth={3} strokeLinecap="round" />
        {!reduce && [0, 1.3, 2.6].map((d) => (
          <circle key={d} r={9} className="fill-volt">
            <animateMotion dur="3.9s" begin={`${d}s`} repeatCount="indefinite" path={FLOW} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".5 0 .3 1" />
          </circle>
        ))}
        {[[760, 505], [1080, 770], [1290, 790]].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r={7} className="fill-background stroke-foreground" strokeWidth={2} />
        ))}
      </svg>

      <div className="mx-auto flex max-w-7xl flex-col px-5 pb-10 pt-28 md:px-10 md:pt-32">
        <div className="eyebrow">Solar mining DAO · Illinois</div>
        <h1 className="mt-5 max-w-[12ch] font-display text-[15vw] font-semibold leading-[0.88] tracking-[-0.045em] md:text-[9.5vw] xl:text-[150px]">
          {words.map((w, i) => (
            <span key={w} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
              <motion.span
                className={`inline-block ${w === "out." ? "font-serif italic font-normal tracking-[-0.02em]" : ""}`}
                initial={reduce ? false : { y: "105%" }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.15 + i * 0.09 }}
              >
                {w}&nbsp;
              </motion.span>
              {i === 1 && <br />}
            </span>
          ))}
        </h1>
        <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }}>
          <p className="mt-6 max-w-md text-lg leading-snug">Bond USDC into a solar project. Get HASH. Earn 80% of the Bitcoin our miners make.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/" className="cta group">Bond into a project <Arrow /></Link>
            <a href="#calc" className="cta-ghost group">Run the numbers <Arrow /></a>
          </div>
        </motion.div>
      </div>

      {/* readings pinned to the bottom of the photo */}
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-5 pb-6 md:px-10">
        <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-2xl border border-border bg-background/85 backdrop-blur-sm">
          <Reading label="Hashrate" live={live}><Ticker value={th} decimals={1} /> TH</Reading>
          <Reading label="Sats mined · 24h" live={live} sim={!live}><Ticker value={live ? pool!.sats24h : Math.round(liveTh(s) * 50)} /></Reading>
          <Reading label="Miner status" live={live} sim={!live}>{live ? (pool!.online ? "Online" : "Offline") : "Online"}</Reading>
        </div>
      </div>
    </section>
  );
}

function Reading({ label, live, sim, children }: { label: string; live: boolean; sim?: boolean; children: React.ReactNode }) {
  return (
    <div className="p-3 md:p-5">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:text-xs">
        <span className={`size-1.5 rounded-full ${live ? "animate-pulse-volt bg-volt" : "bg-muted-foreground/50"}`} />
        {live ? "Live" : sim ? "Simulated" : "Network"}<span className="hidden sm:inline"> · {label}</span>
      </div>
      <div className="mt-1 font-mono text-lg tabular-nums md:text-3xl">{children}</div>
      <div className="font-mono text-[10px] text-muted-foreground sm:hidden">{label}</div>
    </div>
  );
}
