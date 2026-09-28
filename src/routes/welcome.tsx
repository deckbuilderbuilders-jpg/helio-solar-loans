import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import roof from "@/assets/welcome-roof.jpg";
import {
  APR_CAP,
  APR_FLOOR,
  AUCTION_HOURS,
  HARDWARE_COST_PER_W_DC,
  LABOR_COST_PER_W_DC,
  INSTALL_COST_PER_W_DC,
  ADVANCE_RATE,
  AMEREN_REBATE_PER_W_DC,
  FIRST_REC_PAYMENT_PER_W_DC,
  LOCKUP_MIN_DAYS,
  LOCKUP_MAX_DAYS,
  auctionApr,
  periodYield,
  underwriteNote,
} from "@/lib/helio/auction";

export const WELCOMED_KEY = "helio.welcomed";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "HELIO — Subsidies pay for the roof. You bridge the 90 days." },
      {
        name: "description",
        content:
          "Fund 90–120 day construction notes on Illinois solar roofs. Rate is set by an ascending Dutch auction from 12% up to 25% APR, repaid from the Ameren rebate and the Illinois Shines first REC payment.",
      },
      { property: "og:title", content: "HELIO — Bridge the 90 days between install and subsidy." },
      { property: "og:description", content: "90–120 day notes. 12% → 25% APR by Dutch auction. Repaid by Ameren and Illinois Shines." },
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

const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;
const usd = (n: number, d = 0) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;

const STATIONS = [
  { n: "01", t: "Approved", s: "Part I + interconnect cleared" },
  { n: "02", t: "Auction", s: "APR climbs until the note fills" },
  { n: "03", t: "Build", s: "Crew installs at $1.15/W" },
  { n: "04", t: "Energize", s: "PTO, then Part II" },
  { n: "05", t: "Repaid", s: "Rebate + first REC settle the note" },
];

const TICKER = ["Ameren Illinois", "Illinois Shines", "Group A RECs", "USDC", "Solana", "ICC Trade Date"];

const COMPARE: Array<[string, string, string, string]> = [
  ["HELIO bridge note", "12% → 25% fixed", "90–120 days", "Utility rebate + state REC contract"],
  ["Aave USDC supply", "≈6% variable", "Open", "Crypto collateral, liquidation driven"],
  ["Pendle fixed yield", "≈10% fixed", "To maturity", "Yield-token pricing risk"],
  ["T-bills", "≈4.5%", "3–6 months", "Government paper"],
];

const EXTRAS = [
  ["Nothing to liquidate", "No price oracle, no margin call. Repayment is a check from a utility."],
  ["Fixed term, no rollover", `Cash is locked ${LOCKUP_MIN_DAYS}–${LOCKUP_MAX_DAYS} days. Then it settles.`],
  ["Funded only when approved", "A note opens after Part I and interconnect clearance, never before."],
  ["Escrowed takeout", "Rebate and REC proceeds land in the note account, not a company wallet."],
  ["Every dollar sourced", "Each note shows its REC tier, adder flags and rebate line."],
  ["REC tail as cushion", "The remaining 50% of the 15-year contract sits behind your principal."],
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

/** Live auction clock for the featured note: opened this many hours ago. */
const FEATURED_OPENED_HOURS = 49.5;

function useLiveApr() {
  const [hours, setHours] = useState(FEATURED_OPENED_HOURS);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setHours((h) => Math.min(AUCTION_HOURS, h + 0.05)), 900);
    return () => clearInterval(id);
  }, []);
  return { hours, apr: auctionApr(hours) };
}

function Welcome() {
  const navigate = useNavigate();
  const { hours, apr } = useLiveApr();
  const [kw, setKw] = useState(10);
  const wattsDc = kw * 1000;
  const note = underwriteNote(wattsDc, apr, LOCKUP_MIN_DAYS);
  const lend = 10000;

  useEffect(() => {
    try { localStorage.setItem(WELCOMED_KEY, "1"); } catch { /* ignore */ }
  }, []);

  const enter = () => navigate({ to: "/projects" });
  const progress = Math.min(1, hours / AUCTION_HOURS);

  return (
    <div style={{ ...palette, fontFamily: "var(--font-sans)" }} className="min-h-screen bg-[var(--w-cream)] text-[var(--w-navy)] [color-scheme:light]">
      <style>{`
        @keyframes w-marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes w-blink { 0%,100%{opacity:1} 50%{opacity:.25} }
        .w-marquee { animation: w-marquee 28s linear infinite; }
        .w-blink { animation: w-blink 1.6s ease-in-out infinite; }
        .w-reveal { opacity:0; transform:translateY(24px); transition: opacity .7s ease, transform .7s ease; }
        .w-reveal.w-in { opacity:1; transform:none; }
        @media (prefers-reduced-motion: reduce){ .w-marquee,.w-blink{animation:none} .w-reveal{opacity:1;transform:none} }
      `}</style>

      <header className="sticky top-0 z-20 border-b border-[var(--w-line)] bg-[var(--w-cream)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-black tracking-tight">HELIO</span>
            <span className="hidden rounded-full border border-[var(--w-line)] px-3 py-1 font-mono text-[10px] uppercase tracking-widest sm:inline">
              Illinois solar bridge notes
            </span>
          </div>
          <button onClick={enter} className="rounded-full bg-[var(--w-navy)] px-5 py-2 text-sm font-medium text-[var(--w-cream)] hover:opacity-90">
            Enter app
          </button>
        </div>
      </header>

      {/* Live auction strip */}
      <div className="border-b border-[var(--w-line)] bg-[var(--w-navy)] text-[var(--w-cream)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-6 py-2 font-mono text-[11px] uppercase tracking-widest">
          <span className="flex items-center gap-2"><span className="w-blink inline-block h-2 w-2 rounded-full bg-[var(--w-orange)]" />Live auction</span>
          <span>Springfield 10 kW · <span className="text-[var(--w-orange)]">{pct(apr)} APR</span> and climbing</span>
          <span className="hidden sm:inline">Cap {pct(APR_CAP, 0)}</span>
          <span className="hidden md:inline">{Math.max(0, AUCTION_HOURS - hours).toFixed(1)}h left on clock</span>
        </div>
      </div>

      <section style={grid} className="border-b border-[var(--w-line)]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
          <Reveal>
            <div className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">Approved · Built · Repaid</div>
            <h1 className="mt-4 font-display text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
              Subsidies pay for the roof.<br />You bridge <span className="text-[var(--w-orange)]">the 90 days.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg opacity-80">
              Illinois pays back the full cost of a solar install — but only after it is built and energized. HELIO lends
              the gap. {LOCKUP_MIN_DAYS}–{LOCKUP_MAX_DAYS} days, then the Ameren rebate and the first REC payment settle the note.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={enter} className="h-12 rounded-md bg-[var(--w-orange)] px-6 font-semibold text-[var(--w-navy)] hover:opacity-90">
                Fund a note at {pct(apr)}
              </button>
              <Link to="/docs" className="flex h-12 items-center rounded-md border border-[var(--w-navy)] px-6 font-semibold hover:bg-[var(--w-navy)] hover:text-[var(--w-cream)]">
                Read the underwriting
              </Link>
            </div>
            <dl className="mt-8 grid max-w-lg grid-cols-3 gap-4 border-t border-[var(--w-line)] pt-5 text-sm">
              {[
                [pct(APR_FLOOR, 0) + " → " + pct(APR_CAP, 0), "APR by auction"],
                [`${LOCKUP_MIN_DAYS}–${LOCKUP_MAX_DAYS} days`, "Cash locked"],
                ["0", "Liquidation triggers"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-display text-xl font-bold">{v}</dt>
                  <dd className="opacity-70">{l}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal>
            <div className="relative">
              <img src={roof} alt="Solar panels on an Illinois home roof" width={1280} height={896} className="aspect-[4/3] w-full rounded-lg border border-[var(--w-navy)] object-cover" />
              <div className="absolute -bottom-4 -left-4 rounded-md bg-[var(--w-navy)] px-4 py-3 text-[var(--w-cream)]">
                <div className="font-mono text-[10px] uppercase tracking-widest opacity-70">Springfield · 10 kW AC · Ameren DS-1</div>
                <div className="font-display text-lg font-bold">{usd(10200)} of {usd(12000)} funded</div>
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

      {/* Problem / solution */}
      <section style={grid} className="border-b border-[var(--w-line)]">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-16 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-lg border border-[var(--w-navy)] p-7">
              <div className="font-mono text-xs uppercase tracking-[0.3em] opacity-60">The problem</div>
              <h2 className="mt-3 font-display text-3xl font-black tracking-tight">Installers front the whole job.</h2>
              <p className="mt-4 opacity-80">
                A 10 kW roof costs {usd(wattsDc * INSTALL_COST_PER_W_DC)} in hardware and labor, due the week the crew shows
                up. The rebate arrives about 60 days after Permission to Operate. The first REC payment comes after Part II.
                One roof can park an installer's working capital for four months.
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className="h-full rounded-lg border-2 border-[var(--w-orange)] bg-[var(--w-navy)] p-7 text-[var(--w-cream)]">
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--w-orange)]">The note</div>
              <h2 className="mt-3 font-display text-3xl font-black tracking-tight">You lend the gap, not the risk.</h2>
              <p className="mt-4 opacity-80">
                Lenders fund an approved job in USDC. The rebate and first REC payment are assigned to the note account, so
                repayment comes from Ameren and the state — not from resale, refinancing or a token price.
              </p>
              <p className="mt-4 font-mono text-xs uppercase tracking-widest text-[var(--w-orange)]">
                {usd(note.principal)} lent → {usd(note.takeout)} takeout in {LOCKUP_MIN_DAYS} days
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Auction explainer */}
      <section className="border-b border-[var(--w-line)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <div className="font-mono text-xs uppercase tracking-[0.3em] opacity-60">Rate discovery</div>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight md:text-5xl">
              The rate climbs until the note fills.
            </h2>
            <p className="mt-4 max-w-2xl opacity-80">
              Every note opens at {pct(APR_FLOOR, 0)} and walks up over {AUCTION_HOURS} hours, capped at {pct(APR_CAP, 0)}.
              Wait and you earn more. Wait too long and the note clears without you. Whoever fills the last dollar sets the
              rate, and every lender in that note is paid it.
            </p>

            <div className="mt-10 rounded-lg border border-[var(--w-navy)] p-6">
              <div className="flex items-end justify-between font-mono text-xs uppercase tracking-widest">
                <span>{pct(APR_FLOOR, 0)} floor</span>
                <span className="text-[var(--w-orange)]">{pct(APR_CAP, 0)} cap</span>
              </div>
              <div className="relative mt-3 h-3 rounded-full bg-[var(--w-navy)]/10">
                <div className="h-full rounded-full bg-[var(--w-orange)]" style={{ width: pct(progress) }} />
                <div
                  className="absolute -top-1 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-[var(--w-cream)] bg-[var(--w-navy)]"
                  style={{ left: pct(progress) }}
                />
              </div>
              <div className="mt-6 grid gap-6 sm:grid-cols-3">
                {[
                  [pct(apr), "Offered now"],
                  [pct(periodYield(apr, LOCKUP_MIN_DAYS), 2), `Yield over ${LOCKUP_MIN_DAYS} days`],
                  [usd(lend * (1 + periodYield(apr, LOCKUP_MIN_DAYS)), 0), `${usd(lend)} lent becomes`],
                ].map(([v, l]) => (
                  <div key={l}>
                    <div className="font-display text-4xl font-black tracking-tight">{v}</div>
                    <div className="mt-1 text-sm opacity-70">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Five stations */}
      <section style={grid} className="border-b border-[var(--w-line)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <h2 className="font-display text-3xl font-black tracking-tight md:text-5xl">Five stations. One roof.</h2>
            <ol className="mt-8 grid gap-3 md:grid-cols-5">
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

      {/* Underwriting calculator */}
      <section className="border-b border-[var(--w-line)] bg-[var(--w-navy)] text-[var(--w-cream)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--w-orange)]">Note underwriting</div>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight md:text-5xl">Where the repayment comes from.</h2>
            <label className="mt-8 block max-w-md">
              <span className="font-mono text-xs uppercase tracking-widest opacity-70">System size — {kw.toFixed(1)} kW-DC</span>
              <input
                type="range"
                min={4}
                max={25}
                step={0.5}
                value={kw}
                onChange={(e) => setKw(Number(e.target.value))}
                className="mt-3 w-full accent-[var(--w-orange)]"
              />
            </label>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["Hardware, 31-line bill of materials", `$${HARDWARE_COST_PER_W_DC.toFixed(4)}/W`, usd(wattsDc * HARDWARE_COST_PER_W_DC)],
                    ["Labor", `$${LABOR_COST_PER_W_DC.toFixed(2)}/W`, usd(wattsDc * LABOR_COST_PER_W_DC)],
                    ["Note principal, 85% advance rate", `$${(INSTALL_COST_PER_W_DC * ADVANCE_RATE).toFixed(4)}/W`, usd(note.principal)],
                  ].map(([a, b, c]) => (
                    <tr key={a} className="border-b border-[var(--w-cream)]/15">
                      <td className="py-3">{a}</td>
                      <td className="py-3 font-mono text-xs opacity-60">{b}</td>
                      <td className="py-3 text-right font-mono">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["Ameren DG rebate, $300/kW-DC", `$${AMEREN_REBATE_PER_W_DC.toFixed(2)}/W`, usd(wattsDc * AMEREN_REBATE_PER_W_DC)],
                    ["Illinois Shines first REC payment, 50% of a $90.37/REC Group A contract with the customer-owned adder", `$${FIRST_REC_PAYMENT_PER_W_DC.toFixed(3)}/W`, usd(wattsDc * FIRST_REC_PAYMENT_PER_W_DC)],
                    [`Interest at ${pct(apr)} for ${LOCKUP_MIN_DAYS} days`, "cost to installer", `−${usd(note.interest)}`],
                    ["Takeout cover on principal + interest", "", `${note.coverage.toFixed(2)}×`],
                  ].map(([a, b, c]) => (
                    <tr key={a} className="border-b border-[var(--w-cream)]/15">
                      <td className="py-3 pr-3">{a}</td>
                      <td className="py-3 font-mono text-xs opacity-60">{b}</td>
                      <td className="py-3 text-right font-mono text-[var(--w-orange)]">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-6 max-w-2xl text-sm opacity-70">
              Even at the {pct(APR_CAP, 0)} cap, {LOCKUP_MIN_DAYS} days of interest on a 10 kW roof is about{" "}
              {usd(underwriteNote(10000, APR_CAP, LOCKUP_MIN_DAYS).interest)} — small against the{" "}
              {usd(underwriteNote(10000, APR_CAP, LOCKUP_MIN_DAYS).takeout)} the job collects, which still covers the note{" "}
              {underwriteNote(10000, APR_CAP, LOCKUP_MIN_DAYS).coverage.toFixed(2)}× at the cap. The installer funds the
              other 15% of cost, and the remaining 50% of the 15-year REC contract stays behind the note as cushion.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Featured note */}
      <section className="bg-[var(--w-orange)]">
        <Reveal className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <div className="font-mono text-xs uppercase tracking-[0.3em]">Open note</div>
            <h2 className="mt-3 font-display text-4xl font-black leading-none tracking-tight md:text-6xl">
              Springfield is 85% funded at {pct(apr)}.
            </h2>
            <div className="mt-6 h-3 max-w-xl overflow-hidden rounded-full bg-[var(--w-navy)]/20">
              <div className="h-full bg-[var(--w-navy)]" style={{ width: "85%" }} />
            </div>
            <p className="mt-3 text-sm">
              {usd(10200)} of {usd(12000)} · 10 kW AC / 12 kW-DC · Ameren DS-1 · {LOCKUP_MIN_DAYS}-day term · takeout ≈{" "}
              {usd(13518)} (rebate {usd(3600)} + first REC payment {usd(9918)}).
            </p>
          </div>
          <Link to="/projects" className="self-start rounded-full bg-[var(--w-navy)] px-6 py-3 font-semibold text-[var(--w-cream)] hover:opacity-90 md:self-auto">
            See the note
          </Link>
        </Reveal>
      </section>

      {/* Comparison */}
      <section style={grid} className="border-b border-[var(--w-line)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <h2 className="font-display text-3xl font-black tracking-tight md:text-5xl">Where the yield comes from matters.</h2>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-[var(--w-navy)] text-left font-mono text-[11px] uppercase tracking-widest">
                    <th className="py-3">Venue</th>
                    <th className="py-3">Rate</th>
                    <th className="py-3">Term</th>
                    <th className="py-3">Backed by</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((r, i) => (
                    <tr key={r[0]} className={`border-b border-[var(--w-line)] ${i === 0 ? "bg-[var(--w-orange)]/15 font-semibold" : ""}`}>
                      {r.map((c, j) => <td key={j} className="py-4 pr-4">{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm opacity-60">Comparison rates are indicative market levels, not quotes.</p>
          </Reveal>
        </div>
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
            <Link to="/projects" className="hover:underline">Open notes</Link>
            <Link to="/portfolio" className="hover:underline">Portfolio</Link>
            <Link to="/docs" className="hover:underline">Docs</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
