import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import roof from "@/assets/welcome-roof.jpg";
import { LOCKUP_MIN_DAYS, LOCKUP_MAX_DAYS, POINTS_END, POINTS_START, noteInterest, periodYield } from "@/lib/helio/auction";
import {
  APPLICATION_FEE_PER_KW,
  APR_MAX,
  APR_MIN,
  BATTERY_COST_PER_KWH,
  BATTERY_HARDWARE_PER_KWH,
  BATTERY_INSTALL_PER_KWH,
  BATTERY_REBATE_PER_KWH,
  COVERAGE_FULL,
  COVERAGE_MIN,
  CREATOR_TOTAL_MULTIPLE,
  FACTOR_ADVANCE,
  INSTALLER_BASE_PER_W_DC,
  INSTALLER_DAY_ONE_BONUS_PER_W_DC,
  PREBOND_EXIT_FEE,
  SOLAR_COST_PER_W_DC,
  SOLAR_HARDWARE_PER_W_DC,
  batteryForSize,
  payoutPerDollar,
  projectEconomics,
} from "@/lib/helio/economics";

export const WELCOMED_KEY = "helio.welcomed";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "HELIO — Fund Solar. Earn Yield." },
      {
        name: "description",
        content:
          "Lend USDC into Illinois solar at 18–24% APR, set by each roof's REC value. The utility company and the state return principal plus interest in 90–120 days.",
      },
      { property: "og:title", content: "HELIO — Fund Solar. Earn Yield." },
      {
        property: "og:description",
        content:
          "18–24% APR on Illinois solar bridge notes, repaid in 90–120 days. Early lenders earn up to 2x points.",
      },
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
  { n: "01", t: "Import", s: "Illinois Shines application sets the REC value" },
  { n: "02", t: "Fund", s: "Fixed APR · points 2x → 1x as it fills" },
  { n: "03", t: "Build", s: "Crew installs solar and storage" },
  { n: "04", t: "Energize", s: "PTO, then Part II" },
  { n: "05", t: "Factor", s: `REC tail sold at ${Math.round(FACTOR_ADVANCE * 100)}% of face` },
  { n: "06", t: "Repaid", s: "Principal + interest in one payment" },
];

const TICKER = ["Ameren Illinois", "ComEd", "Illinois Shines", "REC contracts", "Paired storage", "USDC", "Solana"];

const COMPARE: Array<[string, string, string, string]> = [
  ["HELIO note", `${Math.round(APR_MIN * 100)}–${Math.round(APR_MAX * 100)}% fixed + points`, `${LOCKUP_MIN_DAYS}–${LOCKUP_MAX_DAYS} days`, "Utility rebates, state REC contract, factored REC tail"],
  ["Aave USDC supply", "≈6% variable", "Open", "Crypto collateral, liquidation driven"],
  ["Pendle fixed yield", "≈10% fixed", "To maturity", "Yield-token pricing risk"],
  ["T-bills", "≈4.5%", "3–6 months", "Government paper"],
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

function Welcome() {
  const navigate = useNavigate();
  const [kw, setKw] = useState(10);
  const [cf, setCf] = useState(0.1642);
  const e = projectEconomics(kw, batteryForSize(kw), { capacityFactor: cf });
  const interest = noteInterest(e.buildCost, e.apr, LOCKUP_MAX_DAYS);
  const flagship = projectEconomics(10);
  const comed = projectEconomics(10, 64, { group: "B" });
  const shaded = projectEconomics(10, 64, { capacityFactor: 0.14 });
  const apr = flagship.apr;
  const lend = 10000;
  const funded = 0.42;

  useEffect(() => {
    try { localStorage.setItem(WELCOMED_KEY, "1"); } catch { /* ignore */ }
  }, []);

  const enter = () => navigate({ to: "/projects" });


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
              Illinois solar + storage notes
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/solar" className="hidden rounded-full border border-[var(--w-line)] px-4 py-2 text-sm font-medium hover:bg-[var(--w-navy)] hover:text-[var(--w-cream)] sm:inline">
              For homeowners
            </Link>
            <button onClick={enter} className="rounded-full bg-[var(--w-navy)] px-5 py-2 text-sm font-medium text-[var(--w-cream)] hover:opacity-90">
              Enter app
            </button>
          </div>
        </div>
      </header>

      {/* Live note strip */}
      <div className="border-b border-[var(--w-line)] bg-[var(--w-navy)] text-[var(--w-cream)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-6 py-2 font-mono text-[11px] uppercase tracking-widest">
          <span className="flex items-center gap-2"><span className="w-blink inline-block h-2 w-2 rounded-full bg-[var(--w-orange)]" />Filling now</span>
          <span>Springfield 10 kW + 64 kWh · <span className="text-[var(--w-orange)]">{pct(apr, 2)} APR</span> fixed</span>
          <span className="hidden sm:inline">{flagship.coverage.toFixed(2)}× coverage</span>
          <span className="hidden md:inline">{(POINTS_START - (POINTS_START - POINTS_END) * funded).toFixed(2)}× points now</span>
        </div>
      </div>

      <section style={grid} className="border-b border-[var(--w-line)]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
          <Reveal>
            <div className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">
              Senior secured bridge notes · {LOCKUP_MIN_DAYS}–{LOCKUP_MAX_DAYS} day lockup
            </div>
            <h1 className="mt-4 font-display text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
              Fund Solar. <span className="text-[var(--w-orange)]">Earn Yield.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg opacity-80">
              Earn {pct(APR_MIN, 0)}–{pct(APR_MAX, 0)} APR. The utility company and the state return your principal plus
              interest in 120 days. Early dollars earn up to {POINTS_START}× points.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={enter} className="h-12 rounded-md bg-[var(--w-orange)] px-6 font-semibold text-[var(--w-navy)] hover:opacity-90">
                Fund a note at {pct(apr, 2)}
              </button>
              <Link to="/docs" className="flex h-12 items-center rounded-md border border-[var(--w-navy)] px-6 font-semibold hover:bg-[var(--w-navy)] hover:text-[var(--w-cream)]">
                Read the underwriting
              </Link>
            </div>
            <dl className="mt-8 grid max-w-lg grid-cols-3 gap-4 border-t border-[var(--w-line)] pt-5 text-sm">
              {[
                [`${LOCKUP_MIN_DAYS}–${LOCKUP_MAX_DAYS}d`, "To full principal return"],
                [`${pct(APR_MIN, 0)}–${pct(APR_MAX, 0)}`, "APR, set by each roof's REC value"],
                [`$${payoutPerDollar(apr, 120).toFixed(2)}`, "Back per $1 lent, day 120"],
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
                <div className="font-mono text-[10px] uppercase tracking-widest opacity-70">Springfield · 10 kW-DC + 64 kWh · Ameren DS-1</div>
                <div className="font-display text-lg font-bold">{usd(flagship.buildCost * funded)} of {usd(flagship.buildCost)} funded</div>
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

      {/* Two sources of repayment */}
      <section style={grid} className="border-b border-[var(--w-line)]">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-16 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-lg border border-[var(--w-navy)] p-7">
              <div className="font-mono text-xs uppercase tracking-[0.3em] opacity-60">Source one · Fixed rebates</div>
              <h2 className="mt-3 font-display text-3xl font-black tracking-tight">Your $1 comes back from a utility check.</h2>
              <p className="mt-4 opacity-80">
                The Ameren DG rebate ($300/kW) and paired-storage rebate ($300/kWh) are fixed per kW installed, plus the
                Illinois Shines first REC payment — {usd(flagship.takeout)} after the state's 5% collateral hold, against a{" "}
                {usd(flagship.buildCost)} build. No price oracle, no margin call, no rollover.
              </p>
              <p className="mt-4 font-mono text-xs uppercase tracking-widest opacity-60">
                {usd(lend)} lent → {usd(lend * (1 + periodYield(apr, LOCKUP_MAX_DAYS)))} at day 120
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className="h-full rounded-lg border-2 border-[var(--w-orange)] bg-[var(--w-navy)] p-7 text-[var(--w-cream)]">
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--w-orange)]">Source two · The REC tail, sold</div>
              <h2 className="mt-3 font-display text-3xl font-black tracking-tight">No six-year wait. The tail is cashed up front.</h2>
              <p className="mt-4 opacity-80">
                The other half of the 15-year REC contract is sold at {pct(FACTOR_ADVANCE, 0)} of face the day the system
                energizes — {usd(flagship.factorProceeds)} on a 10 kW roof. That cushion is what pays the higher rate.
              </p>
              <p className="mt-4 font-mono text-xs uppercase tracking-widest text-[var(--w-orange)]">
                {usd(flagship.totalCash)} of cash against {usd(flagship.buildCost)} — {flagship.coverage.toFixed(2)}× coverage
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Pricing explainer */}
      <section className="border-b border-[var(--w-line)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <div className="font-mono text-xs uppercase tracking-[0.3em] opacity-60">Pricing</div>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight md:text-5xl">Each roof's rate comes from its REC value.</h2>
            <p className="mt-4 max-w-2xl opacity-80">
              Rebates are fixed. The REC contract depends on production — size, capacity factor, utility and adders, all on
              the state application. A thinner cushion pays more: {pct(APR_MAX, 0)} at {COVERAGE_MIN.toFixed(2)}× coverage,
              down to {pct(APR_MIN, 0)} at {COVERAGE_FULL.toFixed(2)}×. Below {COVERAGE_MIN.toFixed(2)}× a roof isn't listed.
            </p>
            <div className="mt-10 grid gap-3 md:grid-cols-3">
              {[
                ["ComEd roof", comed, "Group B REC prices"],
                ["Ameren roof", flagship, "Group A, customer-owned"],
                ["Shaded Ameren roof", shaded, "14% capacity factor"],
              ].map(([t, x, d]) => {
                const ex = x as typeof flagship;
                return (
                  <div key={t as string} className="rounded-lg border border-[var(--w-navy)] p-6">
                    <div className="font-display text-4xl font-black tracking-tight">{pct(ex.apr, 1)}</div>
                    <div className="mt-1 font-display text-lg font-bold">{t as string}</div>
                    <div className="font-mono text-xs text-[var(--w-orange)]">{ex.coverage.toFixed(2)}× coverage · {ex.rec.quantity} RECs × ${ex.rec.price.toFixed(2)}</div>
                    <div className="mt-2 text-sm opacity-70">{d as string}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 rounded-lg border-2 border-[var(--w-orange)] p-6">
              <div className="font-display text-2xl font-black tracking-tight">Early dollars earn up to {POINTS_START}× points.</div>
              <p className="mt-2 text-sm opacity-70">
                Everyone in a note earns the same APR, from the day their deposit lands. Points start at {POINTS_START}× when a
                note is empty and fall to {POINTS_END}× as it fills. Before it fills you can pull your deposit for a{" "}
                {pct(PREBOND_EXIT_FEE, 1)} fee; once it fills, cash is locked until takeout.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Six stations */}
      <section style={grid} className="border-b border-[var(--w-line)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <h2 className="font-display text-3xl font-black tracking-tight md:text-5xl">Six stations. One roof.</h2>
            <ol className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
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
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--w-orange)]">Project underwriting</div>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight md:text-5xl">Every dollar, and where it comes from.</h2>
            <label className="mt-8 block max-w-md">
              <span className="font-mono text-xs uppercase tracking-widest opacity-70">
                System size — {kw.toFixed(1)} kW-DC with {e.batteryKwh} kWh storage
              </span>
              <input
                type="range"
                min={4}
                max={25}
                step={0.5}
                value={kw}
                onChange={(ev) => setKw(Number(ev.target.value))}
                className="mt-3 w-full accent-[var(--w-orange)]"
              />
            </label>
            <label className="mt-4 block max-w-md">
              <span className="font-mono text-xs uppercase tracking-widest opacity-70">Capacity factor — {pct(cf, 1)}</span>
              <input type="range" min={0.12} max={0.19} step={0.001} value={cf} onChange={(ev) => setCf(Number(ev.target.value))} className="mt-3 w-full accent-[var(--w-orange)]" />
            </label>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-[var(--w-orange)]">Build cost</div>
                <table className="mt-2 w-full text-sm">
                  <tbody>
                    {[
                      ["Solar hardware", `$${SOLAR_HARDWARE_PER_W_DC.toFixed(2)}/W`, usd(e.wattsDc * SOLAR_HARDWARE_PER_W_DC)],
                      ["Installer base fee", `$${INSTALLER_BASE_PER_W_DC.toFixed(2)}/W`, usd(e.installerBase)],
                      ["Day-one completion bonus", `$${INSTALLER_DAY_ONE_BONUS_PER_W_DC.toFixed(2)}/W`, usd(e.installerDayOneBonus)],
                      ["Battery hardware", `$${BATTERY_HARDWARE_PER_KWH}/kWh`, usd(e.batteryKwh * BATTERY_HARDWARE_PER_KWH)],
                      ["Battery install", `$${BATTERY_INSTALL_PER_KWH}/kWh`, usd(e.batteryKwh * BATTERY_INSTALL_PER_KWH)],
                      ["Total build", `$${SOLAR_COST_PER_W_DC.toFixed(2)}/W + $${BATTERY_COST_PER_KWH}/kWh`, usd(e.buildCost)],
                      ["State application fee, creator funded", `$${APPLICATION_FEE_PER_KW}/kW`, usd(e.applicationFee)],
                    ].map(([a, b, c]) => (
                      <tr key={a} className="border-b border-[var(--w-cream)]/15">
                        <td className="py-3 pr-3">{a}</td>
                        <td className="py-3 font-mono text-xs opacity-60">{b}</td>
                        <td className="py-3 text-right font-mono">{c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-[var(--w-orange)]">Day 90–120 cash</div>
                <table className="mt-2 w-full text-sm">
                  <tbody>
                    {[
                      ["Ameren DG rebate", "$300/kW-DC", usd(e.amerenSolarRebate)],
                      ["Ameren paired-storage rebate", `$${BATTERY_REBATE_PER_KWH}/kWh`, usd(e.amerenBatteryRebate)],
                      [`First REC payment, ${pct(e.rec.firstPct, 0)} of ${e.rec.quantity} RECs × $${e.rec.price.toFixed(2)}`, "less 5% collateral", usd(e.firstRecPayment - e.recCollateral)],
                      [`REC tail sold at ${pct(FACTOR_ADVANCE, 0)} of ${usd(e.factorFace)}`, "factored", usd(e.factorProceeds)],
                      ["Coverage → APR", `${e.coverage.toFixed(2)}×`, e.listable ? pct(e.apr, 2) : "not listed"],
                      [`Interest at ${pct(e.apr, 1)} for ${LOCKUP_MAX_DAYS} days`, "lenders", `−${usd(interest)}`],
                      [`Creator ${CREATOR_TOTAL_MULTIPLE}× cash on the filing fee`, "from surplus", usd(e.creatorTotal)],
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
            </div>
            <p className="mt-6 max-w-3xl text-sm opacity-70">
              On a {kw.toFixed(1)} kW roof the day-120 cash is {usd(e.totalCash)} against a {usd(e.buildCost)} build —{" "}
              {e.coverage.toFixed(2)}× coverage. The customer's {usd(e.ppaMonthly)} monthly payment goes to HELIO for maintenance.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Creator mechanic */}
      <section className="bg-[var(--w-orange)]">
        <Reveal className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <div className="font-mono text-xs uppercase tracking-[0.3em]">Anyone can start a roof</div>
            <h2 className="mt-3 font-display text-4xl font-black leading-none tracking-tight md:text-6xl">
              {usd(flagship.applicationFee)} to create. {usd(flagship.creatorTotal)} back.
            </h2>
            <p className="mt-4 max-w-2xl text-sm">
              The creator uploads the Illinois Shines application and covers the {usd(APPLICATION_FEE_PER_KW)}/kW state
              filing fee. That money is the only money at risk: if the note never fills, it is gone. If the roof gets built,
              the creator takes {CREATOR_TOTAL_MULTIPLE}× back in cash at takeout ({usd(flagship.creatorTotal)}).
              Lenders who deposit before the note fills can still walk away for {pct(PREBOND_EXIT_FEE, 1)}, which is paid to
              the lenders who stayed.
            </p>
          </div>
          <Link to="/projects" className="self-start rounded-full bg-[var(--w-navy)] px-6 py-3 font-semibold text-[var(--w-cream)] hover:opacity-90 md:self-auto">
            See open notes
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
              {[
                ["Nothing to liquidate", "No price oracle, no margin call. Repayment is a check from a utility."],
                ["Fixed term, no rollover", `Cash is locked ${LOCKUP_MIN_DAYS}–${LOCKUP_MAX_DAYS} days once the note fills.`],
                ["Storage covers the interest", `Ameren pays ${usd(BATTERY_REBATE_PER_KWH)}/kWh against a ${usd(BATTERY_COST_PER_KWH)}/kWh cost.`],
                ["One payment, no tail risk", "The REC tail is sold at energization. You're paid out in full at takeout."],
                ["Priced from the application", "Every REC input comes from the state filing, fingerprinted on the note."],
                ["Every dollar sourced", "Each note shows its REC tier, adder flags, rebates and battery line."],
              ].map(([t, d]) => (
                <div key={t} className="rounded-lg border border-[var(--w-navy)] bg-[var(--w-cream)] p-5">
                  <div className="font-display text-lg font-bold">{t}</div>
                  <div className="mt-1 text-sm opacity-70">{d}</div>
                </div>
              ))}
            </div>
            <p className="mt-6 max-w-3xl text-xs opacity-60">
              Illustrative figures for an Ameren DS-1 roof. Cash on and off ramp charges roughly 0.3–0.8% per crossing. The
              {pct(FACTOR_ADVANCE, 0)} factoring advance is a working assumption, not a quoted rate.
            </p>
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
