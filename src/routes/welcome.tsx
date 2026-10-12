import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { curveFor, hashOut, price, HASH_PER_TH, HOLDER_SHARE, SATS_PER_TH_DAY, UNBOND_FEE } from "@/lib/hash/curve";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "HELIO — Sunlight in. Bitcoin out." },
      { name: "description", content: "A DAO that turns solar power into Bitcoin. Bond USDC into a solar project, get HASH, earn 80% of what we mine." },
      { property: "og:title", content: "HELIO — Sunlight in. Bitcoin out." },
      { property: "og:description", content: "Bond USDC into a solar project, get HASH, earn 80% of what we mine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Welcome,
});

const STEPS = [
  ["Bond", "USDC into a solar project"],
  ["Build", "We install solar + miners"],
  ["Power", "Sun runs the machines"],
  ["Mine", "Hashrate joins the network"],
  ["Earn", "80% of BTC to HASH"],
] as const;

// Example project used for the calculator: $100k raise, 50 TH.
const EX_RAISE = 100_000;
const EX_TH = 50;
const GENESIS_TH = 100;

function Gate({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [out, setOut] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length)), 280);
    const a = setTimeout(() => setOut(true), 2100);
    const b = setTimeout(onDone, 2750);
    return () => { clearInterval(t); clearTimeout(a); clearTimeout(b); };
  }, [onDone]);
  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-foreground px-6 text-background transition-all duration-700 ease-[cubic-bezier(.7,0,.2,1)] ${out ? "-translate-y-full" : ""}`}
    >
      <div className="font-mono text-xs tracking-[0.3em] text-primary">SUNLIGHT . IN . BITCOIN . OUT .</div>
      <div className="mt-6 text-center font-display text-4xl font-semibold md:text-6xl">From solar roof,<br />to streaming sats.</div>
      <ol className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-xs">
        {STEPS.map(([t], i) => (
          <li key={t} className={`transition-all duration-300 ${i < step ? "opacity-100" : "translate-y-2 opacity-0"}`}>
            <span className="text-primary">0{i + 1}</span> {t}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Pipeline() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 1600);
    return () => clearInterval(t);
  }, []);
  const pct = (active / (STEPS.length - 1)) * 100;
  return (
    <div className="relative rounded-2xl border border-border bg-card p-6 shadow-card md:p-10">
      {/* desktop track */}
      <div className="relative hidden md:block">
        <div className="absolute left-[10%] right-[10%] top-6 h-px bg-border" />
        <div className="absolute left-[10%] top-6 h-0.5 -translate-y-px bg-primary transition-all duration-700 ease-out" style={{ width: `${pct * 0.8}%` }} />
        <div
          className="absolute top-6 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-volt transition-all duration-700 ease-out"
          style={{ left: `${10 + pct * 0.8}%` }}
        />
        <ol className="relative grid grid-cols-5">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="flex flex-col items-center text-center">
              <div className={`size-12 rounded-full border-2 bg-card transition-colors duration-500 ${i <= active ? "border-primary" : "border-border"}`} />
              <div className="mt-4 font-mono text-xs text-muted-foreground">0{i + 1}</div>
              <div className="font-display text-lg font-semibold">{t}</div>
              <p className="mt-1 max-w-[12ch] text-xs text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </div>
      {/* mobile stepper */}
      <ol className="space-y-4 md:hidden">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="flex items-center gap-4">
            <div className={`size-3 rounded-full transition-colors duration-500 ${i <= active ? "bg-primary" : "bg-border"}`} />
            <div>
              <span className="font-mono text-xs text-muted-foreground">0{i + 1} </span>
              <span className="font-display font-semibold">{t}</span>
              <span className="text-sm text-muted-foreground"> — {d}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Calculator() {
  const c = useMemo(() => curveFor(EX_RAISE, EX_TH), []);
  const [fill, setFill] = useState(10); // % of raise already bonded
  const [usd, setUsd] = useState(1000);
  const raised = (fill / 100) * EX_RAISE;
  const room = EX_RAISE - raised;
  const amt = Math.min(usd, room);
  const hash = hashOut(c, raised, amt);
  const th = hash / HASH_PER_TH;
  const sats = th * SATS_PER_TH_DAY * HOLDER_SHARE;
  const avg = hashOut(c, 0, EX_RAISE) / EX_RAISE;
  const mult = hash / amt / avg;

  // curve path: HASH price vs fill
  const pts = Array.from({ length: 41 }, (_, i) => {
    const f = i / 40;
    return [f, price(c, f * EX_RAISE)] as const;
  });
  const pMax = price(c, EX_RAISE);
  const path = pts.map(([f, p], i) => `${i ? "L" : "M"}${f * 300},${120 - (p / pMax) * 110}`).join(" ");
  const dotY = 120 - (price(c, raised) / pMax) * 110;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="eyebrow">Bonding curve · example project</div>
        <svg viewBox="0 0 300 125" className="mt-4 w-full">
          <path d={`${path} L300,125 L0,125 Z`} className="fill-primary/10" />
          <path d={path} className="fill-none stroke-primary" strokeWidth={2} />
          <line x1={(fill / 100) * 300} x2={(fill / 100) * 300} y1={0} y2={125} className="stroke-border" strokeDasharray="3 3" />
          <circle cx={(fill / 100) * 300} cy={dotY} r={5} className="fill-primary" />
        </svg>
        <label className="mt-4 block text-sm">
          Project already {fill}% bonded
          <input type="range" min={0} max={95} value={fill} onChange={(e) => setFill(+e.target.value)} className="mt-2 w-full accent-[var(--primary)]" />
        </label>
        <p className="mt-2 text-sm text-muted-foreground">
          HASH price ${price(c, raised).toFixed(3)}. Early = cheaper HASH.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="eyebrow">You bond</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-4xl font-semibold">$</span>
          <input
            type="number" min={10} value={usd}
            onChange={(e) => setUsd(Math.max(0, +e.target.value))}
            className="w-full bg-transparent font-display text-4xl font-semibold outline-none"
          />
        </div>
        <input type="range" min={50} max={10000} step={50} value={usd} onChange={(e) => setUsd(+e.target.value)} className="mt-3 w-full accent-[var(--primary)]" />
        <dl className="mt-6 grid grid-cols-2 gap-4">
          <Stat k="HASH you get" v={Math.round(hash).toLocaleString()} />
          <Stat k="vs. average buyer" v={`${mult.toFixed(2)}×`} hot />
          <Stat k="Hashrate you own" v={`${th.toFixed(2)} TH`} />
          <Stat k="Est. sats / day" v={Math.round(sats).toLocaleString()} />
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Example: ${EX_RAISE.toLocaleString()} project adding {EX_TH} TH. Sats use an estimated {SATS_PER_TH_DAY} sats/TH/day; real payouts follow live hashprice.
        </p>
      </div>
    </div>
  );
}

function Stat({ k, v, hot }: { k: string; v: string; hot?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className={`font-mono text-xl ${hot ? "text-primary" : ""}`}>{v}</dd>
    </div>
  );
}

function Count({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / 1200, 1);
      setN(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{Math.round(n).toLocaleString()}{suffix}</>;
}

const ROWS = [
  ["Power cost", "Grid rate, keeps rising", "Your home rate", "Sunlight"],
  ["Hardware", "Somewhere you can't see", "Loud and hot, in your garage", "Installed and run by us"],
  ["What you hold", "A contract", "A machine that ages", "HASH, a token you can move"],
  ["Payout", "After hidden fees", "Minus your power bill", "80% of BTC mined"],
];

const FAQ = [
  ["What is HASH?", "A token. It equals a share of all HELIO hashrate. More projects, more hashrate."],
  ["Why is early cheaper?", "Each project has a curve like pump.fun. The first dollars get the most HASH."],
  ["Can I pull out?", `Yes, before the project is fully bonded. It costs a flat $${UNBOND_FEE.toFixed(2)}.`],
  ["Where does the other 20% go?", "To the DAO. It runs the sites. Solar payments buy more miners."],
  ["When do I start earning?", "When the project is built and its miners switch on."],
];

function Welcome() {
  const [gate, setGate] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem("helio.welcomed", "1");
      if (!sessionStorage.getItem("helio.gate")) {
        sessionStorage.setItem("helio.gate", "1");
        setGate(true);
      }
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="min-h-screen">
      {gate && <Gate onDone={() => setGate(false)} />}

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 md:px-8">
        <span className="font-display text-lg font-semibold">HELIO</span>
        <Link to="/" className="text-sm hover:underline">Enter app →</Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 md:px-8 md:pt-16">
        <div className="eyebrow animate-rise">Solar mining DAO</div>
        <h1 className="mt-4 max-w-4xl animate-rise font-display text-5xl font-semibold leading-[1.02] md:text-8xl">
          Sunlight in.<br />Bitcoin out.
        </h1>
        <p className="mt-6 max-w-xl animate-rise text-lg text-muted-foreground">
          Bond USDC into a solar project. Get HASH. Earn 80% of the Bitcoin our miners make.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg"><Link to="/">Bond into a project</Link></Button>
          <Button asChild size="lg" variant="outline"><a href="#calc">Run the numbers</a></Button>
        </div>
        <div className="mt-12"><Pipeline /></div>
      </section>

      {/* Calculator */}
      <section id="calc" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16 md:px-8">
        <h2 className="font-display text-3xl font-semibold md:text-5xl">Early bonders get more.</h2>
        <p className="mt-3 max-w-xl text-muted-foreground">Drag the curve. See what your dollars buy.</p>
        <div className="mt-8"><Calculator /></div>
      </section>

      {/* Inverted network */}
      <section className="bg-foreground py-20 text-background">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="font-mono text-xs tracking-[0.3em] text-primary">THE NETWORK</div>
          <h2 className="mt-4 max-w-3xl font-display text-3xl font-semibold md:text-5xl">Every project makes the whole network bigger.</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div><div className="font-mono text-5xl"><Count to={GENESIS_TH} /> TH</div><p className="mt-2 opacity-70">Hashrate today</p></div>
            <div><div className="font-mono text-5xl"><Count to={80} />%</div><p className="mt-2 opacity-70">Of mined BTC to HASH holders</p></div>
            <div><div className="font-mono text-5xl">$<Count to={0} /></div><p className="mt-2 opacity-70">Power bill for the miners</p></div>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-xl bg-background/15 md:grid-cols-3">
            {[
              ["Bond", "Fill a project's curve with USDC."],
              ["Build", "Fully bonded? We install solar, batteries and miners."],
              ["Grow", "Solar payments buy new miners. Your HASH earns more."],
            ].map(([t, d]) => (
              <div key={t} className="bg-foreground p-6">
                <div className="font-display text-xl font-semibold">{t}</div>
                <p className="mt-1 text-sm opacity-70">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <h2 className="font-display text-3xl font-semibold md:text-5xl">Mining, minus the hard parts.</h2>
        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4" />
                <th className="p-4 font-medium text-muted-foreground">Cloud mining</th>
                <th className="p-4 font-medium text-muted-foreground">Miner at home</th>
                <th className="p-4 font-display font-semibold text-primary">HELIO</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([k, a, b, h]) => (
                <tr key={k} className="border-b border-border last:border-0 transition-colors hover:bg-muted/50">
                  <td className="p-4 font-medium">{k}</td>
                  <td className="p-4 text-muted-foreground">{a}</td>
                  <td className="p-4 text-muted-foreground">{b}</td>
                  <td className="p-4 font-medium">{h}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-20 md:grid-cols-[1fr_2fr] md:px-8">
        <h2 className="font-display text-3xl font-semibold md:text-4xl">Questions.</h2>
        <div className="divide-y divide-border border-y border-border">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {q}<span className="text-primary transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Close */}
      <section className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 md:flex-row md:items-end md:justify-between md:px-8">
          <h2 className="font-display text-4xl font-semibold md:text-6xl">You bond.<br />We build. The sun mines.</h2>
          <Button asChild size="lg"><Link to="/">See projects</Link></Button>
        </div>
      </section>
    </div>
  );
}
