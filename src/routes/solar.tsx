import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import hero from "@/assets/solar-hero.jpg";
import { CUSTOMER_BILL_REDUCTION, projectEconomics } from "@/lib/helio/economics";
import { WELCOMED_KEY } from "./welcome";

export const Route = createFileRoute("/solar")({
  head: () => ({
    meta: [
      { title: "HELIO — Half the power bill. Zero down." },
      {
        name: "description",
        content:
          "Solar and a whole-home battery, installed for $0 down. One fixed monthly payment, about half your Ameren bill. You own the panels.",
      },
      { property: "og:title", content: "HELIO — Half the power bill. Zero down." },
      {
        property: "og:description",
        content:
          "Solar and a whole-home battery, installed for $0 down. One fixed monthly payment, about half your Ameren bill.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SolarSplash,
});

// Same splash-only palette as /welcome. Scoped to this page.
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

const usd = (n: number, d = 0) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return <div ref={ref} className={`w-reveal ${seen ? "w-in" : ""} ${className}`}>{children}</div>;
}

const TICKER = ["Ameren Illinois territory", "Illinois Shines approved", "Group A RECs", "You own the panels", "$0 down", "Whole-home backup"];

const STEPS = [
  { n: "01", t: "Check your address", s: "We confirm Ameren territory and roof fit in about a minute." },
  { n: "02", t: "We file the paperwork", s: "State application, utility interconnection, permits. All handled." },
  { n: "03", t: "One-day install", s: "Crew mounts panels and the battery in a single day." },
  { n: "04", t: "Flip the switch", s: "Permission to operate, then your new rate starts." },
];


function SolarSplash() {
  const navigate = useNavigate();
  const home = projectEconomics(10);
  const oldBill = Math.round(home.ppaMonthly / CUSTOMER_BILL_REDUCTION);
  const [zip, setZip] = useState("");
  const [zipState, setZipState] = useState<"idle" | "ok" | "bad">("idle");
  const [gridOn, setGridOn] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(WELCOMED_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const checkZip = (ev: FormEvent) => {
    ev.preventDefault();
    if (!/^\d{5}$/.test(zip.trim())) {
      setZipState("bad");
      return;
    }
    setZipState("ok");
  };

  return (
    <div
      style={{ ...palette, fontFamily: "var(--font-sans)" }}
      className="min-h-screen bg-[var(--w-cream)] text-[var(--w-navy)] [color-scheme:light]"
    >
      <style>{`
        @keyframes w-marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes w-blink { 0%,100%{opacity:1} 50%{opacity:.25} }
        .w-marquee { animation: w-marquee 28s linear infinite; }
        .w-blink { animation: w-blink 1.6s ease-in-out infinite; }
        .w-reveal { opacity:0; transform:translateY(24px); transition: opacity .7s ease, transform .7s ease; }
        .w-reveal.w-in { opacity:1; transform:none; }
        @media (prefers-reduced-motion: reduce){ .w-marquee,.w-blink{animation:none} .w-reveal{opacity:1;transform:none} }
      `}</style>

      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="rounded-md bg-[var(--w-cream)] px-3 py-1 font-display text-xl font-black tracking-tight">
            HELIO
          </span>
          <div className="flex items-center gap-3">
            <Link
              to="/welcome"
              className="hidden rounded-full bg-[var(--w-cream)]/90 px-4 py-2 text-sm font-medium hover:bg-[var(--w-cream)] sm:inline"
            >
              For funders
            </Link>
            <a
              href="#check"
              className="rounded-full bg-[var(--w-orange)] px-5 py-2 text-sm font-semibold text-[var(--w-navy)] hover:opacity-90"
            >
              Get started
            </a>
          </div>
        </div>
      </header>

      {/* Full-bleed lifestyle hero — the Base Power move */}
      <section className="relative">
        <img
          src={hero}
          alt="Family on the lawn of their Illinois home with rooftop solar and a home battery at dusk"
          width={1920}
          height={1088}
          className="h-[92vh] min-h-[560px] w-full object-cover"
        />
        <div className="absolute inset-0 bg-white/50" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-6xl px-6 pb-14 text-[var(--w-navy)]">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-[var(--w-orange)]">★★★★★</span>
              <span>4.9 from Illinois homeowners</span>
            </div>
            <h1 className="mt-3 max-w-3xl font-display text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
              Half the power bill. <span className="text-[var(--w-orange)]">Zero down.</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg opacity-90">
              Solar and a whole-home battery, installed free. One fixed monthly payment — about half your Ameren bill.
            </p>

            <form
              id="check"
              onSubmit={checkZip}
              className="mt-7 flex max-w-lg items-center gap-2 rounded-xl bg-[var(--w-cream)] p-2 text-[var(--w-navy)]"
            >
              <input
                value={zip}
                onChange={(ev) => {
                  setZip(ev.target.value);
                  setZipState("idle");
                }}
                inputMode="numeric"
                placeholder="Enter your zip code"
                aria-label="Zip code"
                className="h-11 w-full rounded-lg bg-transparent px-3 outline-none placeholder:opacity-50"
              />
              <button
                type="submit"
                className="h-11 shrink-0 rounded-lg bg-[var(--w-orange)] px-5 font-semibold text-[var(--w-navy)] hover:opacity-90"
              >
                Check my home
              </button>
            </form>
            {zipState === "ok" && (
              <p className="mt-3 max-w-lg rounded-lg bg-[var(--w-cream)]/95 px-4 py-3 text-sm font-medium text-[var(--w-navy)]">
                Good news — {zip} is in Ameren Illinois territory. A 10 kW system with a {home.batteryKwh} kWh battery
                runs about {usd(home.ppaMonthly)}/month, fixed.
              </p>
            )}
            {zipState === "bad" && (
              <p className="mt-3 max-w-lg rounded-lg bg-[var(--w-cream)]/95 px-4 py-3 text-sm font-medium text-[var(--w-navy)]">
                Enter a 5-digit zip code and we'll check your address.
              </p>
            )}
            <p className="mt-4 text-sm opacity-80">No loan. No lien. You own the panels from day one.</p>
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className="overflow-hidden border-b border-[var(--w-line)] py-4">
        <div className="w-marquee flex w-max gap-12 whitespace-nowrap font-display text-lg font-bold uppercase tracking-tight opacity-70">
          {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-12">
              {t}
              <span className="text-[var(--w-orange)]">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* The number that matters — Base's transparent pricing card */}
      <section style={grid} className="border-b border-[var(--w-line)]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <Reveal>
            <div className="font-mono text-xs uppercase tracking-[0.3em] opacity-60">The whole deal, in one number</div>
            <h2 className="mt-3 font-display text-4xl font-black leading-none tracking-tight md:text-6xl">
              <span className="line-through opacity-40">{usd(oldBill)}</span>{" "}
              <span className="text-[var(--w-orange)]">{usd(home.ppaMonthly)}</span>
              <span className="text-2xl font-bold opacity-60">/mo</span>
            </h2>
            <p className="mt-5 max-w-lg text-lg opacity-80">
              A typical 10 kW Illinois home pays Ameren around {usd(oldBill)} a month. With HELIO the same home pays{" "}
              {usd(home.ppaMonthly)} — fixed, and it never steps up. The {Math.round(CUSTOMER_BILL_REDUCTION * 100)}%
              difference stays in your pocket, every month, for 15 years.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "$0 down, $0 install, $0 maintenance — ever",
                `10 kW of panels plus a ${home.batteryKwh} kWh whole-home battery`,
                "Panels titled in your name, not ours",
                "Rate locked for the full 15-year term",
              ].map((li) => (
                <li key={li} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--w-orange)] text-xs font-bold text-[var(--w-navy)]">
                    ✓
                  </span>
                  <span className="opacity-80">{li}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal>
            <div className="rounded-lg border border-[var(--w-navy)] bg-[var(--w-cream)] p-7">
              <div className="font-mono text-[11px] uppercase tracking-widest opacity-60">
                Example home · 10 kW + {home.batteryKwh} kWh · Ameren Illinois
              </div>
              <table className="mt-4 w-full text-sm">
                <tbody>
                  {[
                    ["Today's Ameren bill", usd(oldBill) + "/mo", false],
                    ["HELIO payment, fixed 15 years", usd(home.ppaMonthly) + "/mo", true],
                    ["Upfront cost", "$0", false],
                    ["Maintenance and repairs", "Included", false],
                    ["Outage backup", `${home.batteryKwh} kWh battery`, false],
                    ["You save, year one", usd((oldBill - home.ppaMonthly) * 12), true],
                  ].map(([a, b, hot]) => (
                    <tr key={a as string} className="border-b border-[var(--w-line)] last:border-0">
                      <td className="py-3 pr-3 opacity-80">{a as string}</td>
                      <td
                        className={`py-3 text-right font-mono font-semibold ${hot ? "text-[var(--w-orange)]" : ""}`}
                      >
                        {b as string}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-xs opacity-60">
                Example figures for a typical Ameren Illinois home; your quote depends on roof, usage and shading.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Grid on / grid off — Base's signature two-state explainer */}
      <section className="border-b border-[var(--w-line)] bg-[var(--w-navy)] text-[var(--w-cream)]">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <Reveal>
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--w-orange)]">How it works</div>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight md:text-5xl">
              Your home, powered two ways.
            </h2>
            <div className="mt-8 inline-flex rounded-full border border-[var(--w-cream)]/30 p-1">
              {(["on", "off"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setGridOn(m === "on")}
                  className={`rounded-full px-6 py-2 text-sm font-semibold transition-colors ${
                    gridOn === (m === "on")
                      ? "bg-[var(--w-orange)] text-[var(--w-navy)]"
                      : "text-[var(--w-cream)]/70 hover:text-[var(--w-cream)]"
                  }`}
                >
                  Grid {m === "on" ? "ON" : "OFF"}
                </button>
              ))}
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className={gridOn ? "" : "opacity-40"}>
                <h3 className="flex items-center gap-2 font-display text-2xl font-bold">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full bg-[var(--w-orange)] ${gridOn ? "w-blink" : ""}`} />
                  When the grid is up
                </h3>
                <p className="mt-3 max-w-md opacity-80">
                  Your panels power the house and fill the battery. Extra power flows back to Ameren, and the state pays
                  for every renewable credit your roof generates. That's what makes the half-price rate possible.
                </p>
              </div>
              <div className={gridOn ? "opacity-40" : ""}>
                <h3 className="flex items-center gap-2 font-display text-2xl font-bold">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full bg-[var(--w-orange)] ${gridOn ? "" : "w-blink"}`} />
                  When the grid goes down
                </h3>
                <p className="mt-3 max-w-md opacity-80">
                  The battery takes over instantly — most families never notice the switch. A {home.batteryKwh} kWh pack
                  keeps the lights, fridge and heat running through multi-day outages.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Four steps */}
      <section style={grid} className="border-b border-[var(--w-line)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <div className="font-mono text-xs uppercase tracking-[0.3em] opacity-60">From zip code to switch-on</div>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight md:text-5xl">
              Four steps. One is yours.
            </h2>
            <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-lg border-2 border-[var(--w-orange)] bg-[var(--w-cream)] p-5">
                  <div className="font-mono text-xs text-[var(--w-orange)]">{s.n}</div>
                  <div className="mt-1 font-display text-xl font-bold">{s.t}</div>
                  <div className="mt-1 text-sm opacity-60">{s.s}</div>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* Why it's possible */}
      <section className="border-b border-[var(--w-line)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <div className="font-mono text-xs uppercase tracking-[0.3em] opacity-60">Why it's this cheap</div>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight md:text-5xl">
              Illinois already set the money aside.
            </h2>
            <p className="mt-4 max-w-2xl text-lg opacity-80">
              Between the Ameren rebate and the Illinois Shines program, the state covers the full cost of your system.
              Most installers keep that money or don't know how to file for it. We file it, pass the savings through as
              your rate, and earn our keep from the renewable credits your roof produces over time.
            </p>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {[
                ["Ameren rebate", "Pays the utility's share of your panels and battery, ~60 days after switch-on."],
                ["Illinois Shines", "The state buys your roof's renewable credits — that's the other half of the funding."],
                ["You", "One fixed payment, about half your old bill. That's your entire part."],
              ].map(([t, d]) => (
                <div key={t} className="rounded-lg border border-[var(--w-navy)] p-6">
                  <div className="font-display text-xl font-bold">{t}</div>
                  <div className="mt-2 text-sm opacity-70">{d}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[var(--w-orange)]">
        <Reveal className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <div className="font-mono text-xs uppercase tracking-[0.3em]">Ameren Illinois territory</div>
            <h2 className="mt-3 font-display text-4xl font-black leading-none tracking-tight md:text-6xl">
              Your roof is already worth {usd(home.ppaMonthly)} a month.
            </h2>
            <p className="mt-4 max-w-2xl text-sm">
              Check your address, get a fixed quote, and pick an install day. The whole thing takes about ten minutes of
              your time — we handle the rest.
            </p>
          </div>
          <a
            href="#check"
            onClick={(ev) => {
              ev.preventDefault();
              navigate({ to: "/solar" });
              document.getElementById("check")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="self-start rounded-full bg-[var(--w-navy)] px-6 py-3 font-semibold text-[var(--w-cream)] hover:opacity-90 md:self-auto"
          >
            Check my home
          </a>
        </Reveal>
      </section>

      <footer className="border-t border-[var(--w-line)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm opacity-70">
          <span className="font-display font-black">HELIO</span>
          <span>Illinois solar + storage · Ameren territory · Illinois Shines Group A</span>
          <Link to="/welcome" className="font-medium underline underline-offset-4 hover:opacity-100">
            Looking to fund projects instead?
          </Link>
        </div>
      </footer>
    </div>
  );
}
