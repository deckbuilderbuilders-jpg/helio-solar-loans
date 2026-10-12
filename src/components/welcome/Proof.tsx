import { motion } from "motion/react";
import { liveTh, totalHash, useHash } from "@/lib/hash/store";
import { usePool } from "@/lib/hash/usePool";
import { UNBOND_FEE } from "@/lib/hash/curve";
import { Ticker } from "./Ticker";

export function NetworkStrip() {
  const { s } = useHash();
  const { data: pool } = usePool();
  const live = !!pool?.ok;
  const items: [string, React.ReactNode][] = [
    ["Hashrate online", <><Ticker value={liveTh(s) + (live ? pool!.hashrateTH : 0)} decimals={1} /> TH</>],
    ["Projects", <Ticker value={s.projects.length} />],
    ["HASH supply", <Ticker value={totalHash(s)} />],
    ["To holders / DAO", "80 / 20"],
  ];
  return (
    <section className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-volt">
          <span className={`size-2 rounded-full bg-volt ${live ? "animate-pulse-volt" : "opacity-50"}`} /> Network today {live ? "· live" : ""}
        </div>
        <h2 className="mt-5 max-w-4xl font-display text-4xl font-semibold leading-[0.95] tracking-[-0.035em] md:text-7xl">
          Every project makes <span className="font-serif font-normal italic">the whole network</span> bigger.
        </h2>
        <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-background/15 md:grid-cols-4">
          {items.map(([k, v]) => (
            <div key={k} className="bg-foreground p-6 md:p-8">
              <dd className="font-mono text-4xl tabular-nums md:text-5xl">{v}</dd>
              <dt className="mt-2 text-sm opacity-60">{k}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

const FLOW = [
  ["Your USDC", "Bonds a project", 100],
  ["Solar build", "Panels + batteries", 100],
  ["Miners", "Run on the sun", 100],
] as const;

export function MoneyFlow() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-32">
      <div className="eyebrow">Where the money goes</div>
      <h2 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[0.95] tracking-[-0.035em] md:text-6xl">Dollars become machines. Machines make Bitcoin.</h2>
      <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-4">
        {FLOW.map(([t, d], i) => (
          <motion.div key={t} className="bg-card p-6 md:p-8" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, type: "spring", stiffness: 160, damping: 20 }}>
            <div className="font-mono text-xs text-muted-foreground">0{i + 1}</div>
            <div className="mt-6 font-display text-2xl font-semibold">{t}</div>
            <p className="text-sm text-muted-foreground">{d}</p>
          </motion.div>
        ))}
        <div className="bg-card p-6 md:p-8">
          <div className="font-mono text-xs text-muted-foreground">04 · BTC mined</div>
          <div className="mt-6 flex h-10 overflow-hidden rounded-full">
            <motion.div className="flex items-center bg-volt px-3 font-mono text-xs font-medium" initial={{ width: "0%" }} whileInView={{ width: "80%" }} viewport={{ once: true }} transition={{ delay: 0.5, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}>80%</motion.div>
            <motion.div className="flex items-center bg-foreground px-2 font-mono text-xs text-background" initial={{ width: "0%" }} whileInView={{ width: "20%" }} viewport={{ once: true }} transition={{ delay: 0.9, duration: 0.8 }}>20%</motion.div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">80% to HASH holders. 20% to the DAO to run sites.</p>
        </div>
      </div>
    </section>
  );
}

const ROWS = [
  ["Power cost", "Grid rate, keeps rising", "Your home rate", "Sunlight"],
  ["Hardware", "Somewhere you can't see", "Loud and hot, in your garage", "Installed and run by us"],
  ["What you hold", "A contract", "A machine that ages", "HASH, a token you can move"],
  ["Payout", "After hidden fees", "Minus your power bill", "80% of BTC mined"],
];

export function Compare() {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-24 md:px-10 md:pb-32">
      <h2 className="font-display text-4xl font-semibold tracking-[-0.035em] md:text-6xl">Mining, <span className="font-serif font-normal italic">minus</span> the hard parts.</h2>
      <div className="mt-10 overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-[1fr_1fr_1fr_1.15fr] border-t border-foreground">
          {["", "Cloud mining", "Miner at home", "HELIO"].map((h, i) => (
            <div key={h || "k"} className={`py-5 font-mono text-xs uppercase tracking-[0.14em] ${i === 3 ? "rounded-t-2xl bg-foreground px-5 text-volt" : "pr-4 text-muted-foreground"}`}>{h}</div>
          ))}
          {ROWS.map(([k, a, b, h], r) => (
            <div key={k} className="contents">
              <div className="border-t border-border py-5 pr-4 font-display text-lg font-semibold">{k}</div>
              <div className="border-t border-border py-5 pr-4 text-muted-foreground"><span className="mr-2 opacity-50">×</span>{a}</div>
              <div className="border-t border-border py-5 pr-4 text-muted-foreground"><span className="mr-2 opacity-50">×</span>{b}</div>
              <div className={`border-t border-background/15 bg-foreground px-5 py-5 text-background ${r === ROWS.length - 1 ? "rounded-b-2xl" : ""}`}><span className="mr-2 text-volt">✓</span>{h}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  ["What is HASH?", "A token. It equals a share of all HELIO hashrate. More projects, more hashrate."],
  ["Why is early cheaper?", "Each project has a curve like pump.fun. The first dollars get the most HASH."],
  ["Can I pull out?", `Yes, before the project is fully bonded. It costs a flat $${UNBOND_FEE.toFixed(2)}.`],
  ["Where does the other 20% go?", "To the DAO. It runs the sites. Solar payments buy more miners."],
  ["When do I start earning?", "When the project is built and its miners switch on."],
];

export function Faq() {
  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-24 md:grid-cols-[1fr_2fr] md:px-10 md:pb-32">
      <h2 className="font-display text-4xl font-semibold tracking-[-0.035em] md:text-5xl">Questions.</h2>
      <div className="border-t border-foreground">
        {FAQ.map(([q, a]) => (
          <details key={q} className="faq group border-b border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between py-6 font-display text-xl font-medium">
              {q}
              <span className="grid size-8 place-items-center rounded-full border border-border transition-all duration-300 group-open:rotate-45 group-open:border-volt group-open:bg-volt">+</span>
            </summary>
            <p className="pb-6 pr-12 text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
