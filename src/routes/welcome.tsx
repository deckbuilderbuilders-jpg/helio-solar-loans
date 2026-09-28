import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import roof from "@/assets/welcome-roof.jpg";

export const WELCOMED_KEY = "helio.welcomed";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "HELIO — From panel, to paid roof." },
      { name: "description", content: "Buy a 400 W panel for $400. Burn it into a real Illinois roof. Get paid from the Ameren rebate and Illinois Shines REC takeout." },
      { property: "og:title", content: "HELIO — From panel, to paid roof." },
      { property: "og:description", content: "Real Illinois roofs. $400 panels. Takeout paid by Ameren and Illinois Shines." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

// Splash-only palette. Scoped to this page; app theme untouched.
const palette = {
  "--w-cream": "#FFF9F6",
  "--w-navy": "#0F151D",
  "--w-orange": "#FF7448",
  "--w-line": "rgba(15,21,29,0.14)",
} as CSSProperties;

const grid: CSSProperties = {
  backgroundImage:
    "linear-gradient(var(--w-line) 1px, transparent 1px), linear-gradient(90deg, var(--w-line) 1px, transparent 1px)",
  backgroundSize: "48px 48px",
};

const STATIONS = [
  { n: "01", t: "Buy", s: "400 W panel · $400" },
  { n: "02", t: "Burn", s: "Into a chosen roof" },
  { n: "03", t: "Build", s: "Installed at $1/W" },
  { n: "04", t: "Energize", s: "PTO · Part II" },
  { n: "05", t: "Paid", s: "Ameren + REC USDC" },
];

const TICKER = ["Ameren Illinois", "Illinois Shines", "Solana", "USDC", "ICC", "Group A RECs"];

const STATS = [
  { v: 400, pre: "$", dec: 0, l: "Per 400 W panel" },
  { v: 300, pre: "$", dec: 0, l: "Ameren rebate / kW-DC" },
  { v: 95.37, pre: "$", dec: 2, l: "Per REC, Group A + adders" },
  { v: 12150, pre: "~$", dec: 0, l: "Springfield takeout" },
];

const EXTRAS = [
  ["No loans", "You own a share of a roof, not a debt."],
  ["No liquidations", "No price oracle. Nothing to margin-call."],
  ["Permanent burn", "Panels bond once, into one job."],
  ["Pro-rata shares", "Paid by panels bonded ÷ panels required."],
  ["80/20 REC tail", "24 quarters. 80% to shares, 20% to HELIO."],
  ["Every dollar sourced", "ILS tier, adder flags, rebate on every card."],
];

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return <div ref={ref} className={`w-reveal ${seen ? "w-in" : ""} ${className}`}>{children}</div>;
}

function Counter({ v, pre, dec }: { v: number; pre: string; dec: number }) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(v); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1400);
      setN(v * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, v]);
  return <span ref={ref}>{pre}{n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })}</span>;
}

function Welcome() {
  const navigate = useNavigate();
  const [qty, setQty] = useState("");

  useEffect(() => {
    try { localStorage.setItem(WELCOMED_KEY, "1"); } catch { /* ignore */ }
  }, []);

  const enter = () => navigate({ to: "/shop" });

  return (
    <div style={{ ...palette, fontFamily: "var(--font-sans)" }} className="min-h-screen bg-[var(--w-cream)] text-[var(--w-navy)] [color-scheme:light]">
      <style>{`
        @keyframes w-travel { 0%{left:0%} 100%{left:100%} }
        @keyframes w-marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .w-panel-x { animation: w-travel 9s cubic-bezier(.65,0,.35,1) infinite; }
        .w-marquee { animation: w-marquee 28s linear infinite; }
        .w-reveal { opacity:0; transform:translateY(24px); transition: opacity .7s ease, transform .7s ease; }
        .w-reveal.w-in { opacity:1; transform:none; }
        @media (prefers-reduced-motion: reduce){ .w-panel-x,.w-marquee{animation:none} .w-reveal{opacity:1;transform:none} }
      `}</style>

      <header className="sticky top-0 z-20 border-b border-[var(--w-line)] bg-[var(--w-cream)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-black tracking-tight">HELIO</span>
            <span className="hidden rounded-full border border-[var(--w-line)] px-3 py-1 font-mono text-[10px] uppercase tracking-widest sm:inline">Early access · Solana devnet</span>
          </div>
          <button onClick={enter} className="rounded-full bg-[var(--w-navy)] px-5 py-2 text-sm font-medium text-[var(--w-cream)] hover:opacity-90">Enter app</button>
        </div>
      </header>

      <section style={grid} className="border-b border-[var(--w-line)]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
          <Reveal>
            <div className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">Panel · Roof · Paid</div>
            <h1 className="mt-4 font-display text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">From panel,<br />to <span className="text-[var(--w-orange)]">paid roof.</span></h1>
            <p className="mt-5 max-w-md text-lg opacity-80">Buy a 400 W panel. Burn it into a real Illinois job. Get paid by Ameren and Illinois Shines.</p>
            <form onSubmit={(e) => { e.preventDefault(); enter(); }} className="mt-8 flex max-w-lg flex-col gap-2 rounded-lg border border-[var(--w-navy)] bg-[var(--w-cream)] p-1.5 sm:flex-row">
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="5 panels into the Springfield roof"
                aria-label="What do you want to fund?"
                className="h-11 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-[var(--w-navy)]/40"
              />
              <button type="submit" className="h-11 rounded-md bg-[var(--w-orange)] px-6 font-semibold text-[var(--w-navy)] hover:opacity-90">Buy a panel</button>
            </form>
            <p className="mt-3 text-sm opacity-70">Backed by real Illinois roofs. One panel minimum.</p>
          </Reveal>
          <Reveal>
            <div className="relative">
              <img src={roof} alt="Solar panels on an Illinois home roof" width={1280} height={896} className="aspect-[4/3] w-full rounded-lg border border-[var(--w-navy)] object-cover" />
              <div className="absolute -bottom-4 -left-4 rounded-md bg-[var(--w-navy)] px-4 py-3 text-[var(--w-cream)]">
                <div className="font-mono text-[10px] uppercase tracking-widest opacity-70">Springfield · 10 kW AC</div>
                <div className="font-display text-lg font-bold">17 / 30 panels bonded</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="overflow-hidden border-b border-[var(--w-line)] py-4">
        <div className="w-marquee flex w-max gap-12 whitespace-nowrap font-display text-lg font-bold uppercase tracking-tight opacity-70">
          {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-12">{t}<span className="text-[var(--w-orange)]">✦</span></span>
          ))}
        </div>
      </div>

      <section style={grid} className="border-b border-[var(--w-line)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <h2 className="font-display text-3xl font-black tracking-tight md:text-5xl">Five stations. One roof.</h2>
            <div className="relative mx-[10%] mt-10 hidden h-10 md:block">
              <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-[var(--w-orange)]" />
              <div className="w-panel-x absolute top-1/2 -translate-x-1/2 -translate-y-1/2"><PanelGlyph /></div>
            </div>
            <ol className="mt-6 grid gap-3 md:grid-cols-5">
              {STATIONS.map((s) => (
                <li key={s.n} className="rounded-lg border-2 border-[var(--w-orange)] bg-[var(--w-cream)] p-4">
                  <div className="font-mono text-xs text-[var(--w-orange)]">{s.n}</div>
                  <div className="mt-1 font-display text-xl font-bold">{s.t}</div>
                  <div className="text-xs opacity-60">{s.s}</div>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="border-b border-[var(--w-line)]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.l} className="border-[var(--w-line)] px-6 py-10 [&:not(:last-child)]:border-r">
              <div className="font-display text-4xl font-black tracking-tight md:text-5xl"><Counter v={s.v} pre={s.pre} dec={s.dec} /></div>
              <div className="mt-2 text-sm opacity-70">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[var(--w-orange)]">
        <Reveal className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <div className="font-mono text-xs uppercase tracking-[0.3em]">Featured roof</div>
            <h2 className="mt-3 font-display text-4xl font-black leading-none tracking-tight md:text-6xl">Springfield is 17/30 bonded.</h2>
            <div className="mt-6 h-3 max-w-xl overflow-hidden rounded-full bg-[var(--w-navy)]/20">
              <div className="h-full bg-[var(--w-navy)]" style={{ width: `${(17 / 30) * 100}%` }} />
            </div>
            <p className="mt-3 text-sm">$6,800 raised of $12,000 · takeout ≈ $12,150 (Ameren rebate + 50% first REC payment).</p>
          </div>
          <Link to="/projects" className="self-start rounded-full bg-[var(--w-navy)] px-6 py-3 font-semibold text-[var(--w-cream)] hover:opacity-90 md:self-auto">See the roof</Link>
        </Reveal>
      </section>

      <section style={grid}>
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <h2 className="font-display text-3xl font-black tracking-tight md:text-5xl">Oh yeah, and all this too.</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {EXTRAS.map(([t, d]) => (
                <div key={t} className="rounded-lg border border-[var(--w-navy)] bg-[var(--w-cream)] p-5">
                  <div className="font-display text-lg font-bold">{t}</div>
                  <div className="mt-1 text-sm opacity-70">{d}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="bg-[var(--w-navy)] text-[var(--w-cream)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display text-3xl font-black">HELIO</span>
          <nav className="flex gap-5 text-sm opacity-80">
            <button onClick={enter} className="hover:underline">Buy a panel</button>
            <Link to="/projects" className="hover:underline">Projects</Link>
            <Link to="/docs" className="hover:underline">Docs</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function PanelGlyph() {
  return (
    <svg width="34" height="24" viewBox="0 0 34 24" aria-hidden>
      <rect x="1" y="1" width="32" height="22" rx="1.5" fill="var(--w-navy)" />
      {[9, 17, 25].map((x) => <line key={x} x1={x} y1="1" x2={x} y2="23" stroke="var(--w-cream)" strokeOpacity=".35" />)}
      <line x1="1" y1="12" x2="33" y2="12" stroke="var(--w-cream)" strokeOpacity=".35" />
    </svg>
  );
}
