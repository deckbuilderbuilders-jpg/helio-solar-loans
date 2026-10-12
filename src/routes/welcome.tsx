import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Hero } from "@/components/welcome/Hero";
import { Pipeline, STEPS } from "@/components/welcome/Pipeline";
import { CurveChart } from "@/components/welcome/CurveChart";
import { Compare, Faq, MoneyFlow, NetworkStrip } from "@/components/welcome/Proof";
import { Arrow } from "@/components/welcome/Arrow";

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

function Gate({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1400); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div aria-hidden className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-foreground px-6 text-background"
      initial={{ y: 0 }} exit={{ y: "-100%" }} transition={{ duration: 0.7, ease: [0.7, 0, 0.2, 1] }}>
      <div className="font-mono text-xs tracking-[0.3em] text-volt">SUNLIGHT . IN . BITCOIN . OUT .</div>
      <ol className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-xs">
        {STEPS.map(([t], i) => (
          <motion.li key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.14 }}>
            <span className="text-volt">0{i + 1}</span> {t}
          </motion.li>
        ))}
      </ol>
    </motion.div>
  );
}

function Welcome() {
  const [gate, setGate] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem("helio.welcomed", "1");
      if (!sessionStorage.getItem("helio.gate")) { sessionStorage.setItem("helio.gate", "1"); setGate(true); }
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip">
      {gate && <Gate onDone={() => setGate(false)} />}

      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-10">
          <span className="font-display text-xl font-semibold tracking-tight">HELIO<span className="text-volt">.</span></span>
          <Link to="/" className="group font-mono text-xs uppercase tracking-[0.18em]">Enter app <Arrow /></Link>
        </div>
      </header>

      <Hero />
      <Pipeline />

      <section id="calc" className="mx-auto max-w-7xl scroll-mt-8 px-5 py-24 md:px-10 md:py-32">
        <div className="eyebrow">The bonding curve</div>
        <h2 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[0.95] tracking-[-0.035em] md:text-7xl">
          Early bonders <span className="font-serif font-normal italic">get more.</span>
        </h2>
        <div className="mt-12"><CurveChart /></div>
      </section>

      <NetworkStrip />
      <MoneyFlow />
      <Compare />
      <Faq />

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-5 py-24 md:flex-row md:items-end md:justify-between md:px-10 md:py-32">
          <h2 className="font-display text-5xl font-semibold leading-[0.92] tracking-[-0.04em] md:text-8xl">
            You bond.<br />We build.<br /><span className="font-serif font-normal italic">The sun mines.</span>
          </h2>
          <Link to="/" className="cta group">See projects <Arrow /></Link>
        </div>
      </section>
    </div>
  );
}
