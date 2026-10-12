import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, useState } from "react";

export const STEPS = [
  ["Bond", "USDC into a solar project"],
  ["Build", "We install solar + miners"],
  ["Power", "The sun runs the machines"],
  ["Mine", "Hashrate joins the network"],
  ["Earn", "80% of BTC to HASH"],
] as const;

/** The object that travels: it changes shape at each station. */
function Token({ i }: { i: number }) {
  const shapes = [
    <g key="usdc"><circle cx="20" cy="20" r="16" className="fill-background stroke-foreground" strokeWidth="2" /><text x="20" y="25" textAnchor="middle" className="fill-foreground font-mono text-[14px] font-medium">$</text></g>,
    <g key="panel"><rect x="5" y="9" width="30" height="22" rx="2" className="fill-foreground" /><path d="M5 16h30M5 23h30M15 9v22M25 9v22" className="stroke-background" strokeWidth="1.2" /></g>,
    <g key="bolt"><circle cx="20" cy="20" r="16" className="fill-volt" /><path d="M22 8 12 22h7l-2 10 10-14h-7z" className="fill-foreground" /></g>,
    <g key="block"><rect x="6" y="6" width="28" height="28" rx="4" className="fill-foreground" /><text x="20" y="25" textAnchor="middle" className="fill-background font-mono text-[11px]">TH</text></g>,
    <g key="sat"><circle cx="20" cy="20" r="16" className="fill-volt" /><text x="20" y="26" textAnchor="middle" className="fill-foreground font-display text-[17px] font-semibold">₿</text></g>,
  ];
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.svg key={i} viewBox="0 0 40 40" className="size-14"
        initial={{ scale: 0.4, rotate: -40, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.4, rotate: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 18 }}>
        {shapes[i]}
      </motion.svg>
    </AnimatePresence>
  );
}

export function Pipeline() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 20, mass: 0.6 });
  const left = useTransform(p, [0.05, 0.9], ["10%", "90%"]);
  const width = useTransform(p, [0.05, 0.9], ["0%", "80%"]);
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(Math.min(4, Math.max(0, Math.round(((v - 0.05) / 0.85) * 4)))));

  return (
    <section aria-label="How it works">
      {/* desktop: pinned, scroll drives the token */}
      <div ref={ref} className={`relative hidden md:block ${reduce ? "" : "h-[260vh]"}`}>
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
          <div className="mx-auto w-full max-w-7xl px-10">
            <div className="eyebrow">How it works · 01 → 05</div>
            <h2 className="mt-4 max-w-3xl font-display text-6xl font-semibold leading-[0.95] tracking-[-0.035em]">
              One dollar, <span className="font-serif font-normal italic">all the way</span> to Bitcoin.
            </h2>
            <div className="relative mt-20">
              <div className="absolute left-[10%] right-[10%] top-7 h-px bg-border" />
              <motion.div className="absolute left-[10%] top-7 h-[3px] -translate-y-px rounded-full bg-volt" style={{ width }} />
              <motion.div className="absolute top-7 z-10 -translate-x-1/2 -translate-y-1/2 drop-shadow-lg" style={{ left }}>
                <Token i={active} />
              </motion.div>
              <ol className="relative grid grid-cols-5">
                {STEPS.map(([t, d], i) => (
                  <li key={t} className="flex flex-col items-center pt-20 text-center">
                    <div className={`font-mono text-xs transition-colors ${i <= active ? "text-foreground" : "text-muted-foreground"}`}>0{i + 1}</div>
                    <div className={`mt-1 font-display text-3xl font-semibold tracking-tight transition-opacity duration-500 ${i <= active ? "opacity-100" : "opacity-30"}`}>{t}</div>
                    <p className={`mt-2 max-w-[16ch] text-sm text-muted-foreground transition-opacity duration-500 ${i === active ? "opacity-100" : "opacity-50"}`}>{d}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* mobile: vertical stepper that fills as you scroll */}
      <div className="px-5 py-20 md:hidden">
        <div className="eyebrow">How it works</div>
        <h2 className="mt-3 font-display text-4xl font-semibold leading-[0.95] tracking-[-0.03em]">One dollar, <span className="font-serif font-normal italic">all the way</span> to Bitcoin.</h2>
        <ol className="relative mt-10 space-y-8 border-l border-border pl-8">
          {STEPS.map(([t, d], i) => (
            <motion.li key={t} className="relative" initial={{ opacity: 0.25, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ amount: 0.8 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
              <motion.span className="absolute -left-[37px] top-1.5 size-3 rounded-full bg-border" whileInView={{ backgroundColor: "var(--volt)", scale: [1, 1.5, 1] }} viewport={{ amount: 0.8 }} />
              <div className="font-mono text-xs text-muted-foreground">0{i + 1}</div>
              <div className="font-display text-2xl font-semibold">{t}</div>
              <p className="text-sm text-muted-foreground">{d}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
