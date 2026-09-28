import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties } from "react";

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

const STATIONS = [
  { n: "01", t: "Buy", s: "400 W panel · $400" },
  { n: "02", t: "Burn", s: "Into a chosen roof" },
  { n: "03", t: "Build", s: "Installed at $1/W" },
  { n: "04", t: "Energize", s: "PTO · Part II" },
  { n: "05", t: "Paid", s: "Ameren + REC USDC" },
];

function Welcome() {
  const navigate = useNavigate();
  const [qty, setQty] = useState("");

  useEffect(() => {
    try { localStorage.setItem(WELCOMED_KEY, "1"); } catch { /* ignore */ }
  }, []);

  const enter = () => navigate({ to: "/shop" });

  return (
    <div style={{ ...palette, fontFamily: "var(--font-sans)" }} className="flex min-h-screen flex-col bg-[var(--w-cream)] text-[var(--w-navy)] [color-scheme:light]">
      <style>{`
        @keyframes w-travel { 0%{left:0%} 100%{left:100%} }
        @keyframes w-travel-y { 0%{top:0%} 100%{top:100%} }
        .w-panel-x { animation: w-travel 9s cubic-bezier(.65,0,.35,1) infinite; }
        .w-panel-y { animation: w-travel-y 9s cubic-bezier(.65,0,.35,1) infinite; }
        @media (prefers-reduced-motion: reduce){ .w-panel-x,.w-panel-y{animation:none} }
      `}</style>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-xl font-bold tracking-tight">HELIO</span>
          <span className="hidden text-xs opacity-60 sm:inline">Solana devnet · Ameren Illinois</span>
        </div>
        <button onClick={enter} className="text-sm font-medium underline-offset-4 hover:underline">Enter app</button>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6">
        <section className="pt-10 md:pt-16">
          <div className="font-mono text-xs tracking-[0.3em] opacity-70">PANEL . ROOF . PAID .</div>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-bold leading-[1.02] md:text-7xl">From panel, to paid roof.</h1>
          <p className="mt-5 max-w-xl text-lg opacity-80">Buy a 400 W panel. Burn it into a real Illinois job. Get paid by Ameren and Illinois Shines.</p>
          <p className="mt-3 font-mono text-xs opacity-60">$400 per panel · $300/kW-DC Ameren rebate · $95.37/REC Group A</p>
        </section>

        <Pipeline />

        <section className="max-w-xl pb-10">
          <form onSubmit={(e) => { e.preventDefault(); enter(); }} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="5 panels into the Springfield roof"
              aria-label="What do you want to fund?"
              className="h-12 flex-1 rounded-sm border border-[var(--w-line)] bg-transparent px-4 text-base outline-none placeholder:text-[var(--w-navy)]/40 focus:border-[var(--w-navy)]"
            />
            <button type="submit" className="h-12 rounded-sm bg-[var(--w-orange)] px-6 font-medium text-[var(--w-navy)] transition-opacity hover:opacity-90">Buy a panel</button>
          </form>
          <p className="mt-2 text-sm opacity-70">One panel minimum. You pick the roof. We run the install.</p>
          <Link to="/projects" className="mt-3 inline-block text-sm underline underline-offset-4 opacity-80 hover:opacity-100">Enter app anyway</Link>
        </section>
      </main>

      <div className="border-y border-[var(--w-line)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-6 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium">Springfield · 10 kW AC · 17/30 panels bonded.</span>
          <Link to="/projects" className="underline underline-offset-4 opacity-80">Takeout ≈ $12,150. See the roof.</Link>
        </div>
      </div>

      <footer className="mx-auto flex w-full max-w-6xl gap-3 px-6 py-5 text-xs opacity-60">
        <span>HELIO</span><span>·</span><span>Panel originator</span><span>·</span>
        <button onClick={enter} className="hover:underline">Buy a panel</button>
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

function Pipeline() {
  return (
    <section className="py-12 md:py-16" aria-label="How HELIO works">
      {/* Desktop */}
      <div className="hidden md:block">
        <div className="relative mx-[10%] h-10">
          <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-[var(--w-orange)]" />
          {STATIONS.map((_, i) => (
            <span key={i} className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--w-orange)] bg-[var(--w-cream)]" style={{ left: `${(i / 4) * 100}%` }} />
          ))}
          <div className="w-panel-x absolute top-1/2 -translate-x-1/2 -translate-y-1/2"><PanelGlyph /></div>
        </div>
        <ol className="mt-4 grid grid-cols-5">
          {STATIONS.map((s) => (
            <li key={s.n} className="text-center">
              <div className="font-mono text-xs opacity-60">{s.n}</div>
              <div className="font-display text-lg font-semibold">{s.t}</div>
              <div className="text-xs opacity-60">{s.s}</div>
            </li>
          ))}
        </ol>
      </div>
      {/* Mobile */}
      <div className="relative md:hidden">
        <div className="absolute bottom-3 left-[7px] top-3 w-[2px] bg-[var(--w-orange)]" />
        <div className="absolute bottom-3 left-[-9px] top-3"><div className="w-panel-y absolute -translate-y-1/2"><PanelGlyph /></div></div>
        <ol className="flex flex-col gap-6 pl-10">
          {STATIONS.map((s) => (
            <li key={s.n} className="relative">
              <span className="absolute -left-10 top-1.5 size-4 rounded-full border-2 border-[var(--w-orange)] bg-[var(--w-cream)]" />
              <div className="font-mono text-xs opacity-60">{s.n}</div>
              <div className="font-display text-lg font-semibold">{s.t}</div>
              <div className="text-xs opacity-60">{s.s}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
