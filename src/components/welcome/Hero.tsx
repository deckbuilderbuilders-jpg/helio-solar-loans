import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowUpRight, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/welcome-network.jpg";

export function Hero() {
  const preference = useReducedMotion();
  const [reduce, setReduce] = useState(false);
  useEffect(() => setReduce(Boolean(preference)), [preference]);
  const [opening, setOpening] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setOpening(false), reduce ? 0 : 1100);
    return () => window.clearTimeout(timer);
  }, [reduce]);
  return (
    <section className="welcome-hero relative border-b border-border">
      <AnimatePresence>
        {opening && !reduce && <motion.div className="welcome-image-opening" aria-hidden="true" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}>
          <motion.img src={hero} alt="" initial={{ scale: 1.06 }} animate={{ scale: 1 }} transition={{ duration: 2.2 }} />
          <span className="welcome-opening-label">HELIO / SUNLIGHT IN. BITCOIN OUT.</span>
        </motion.div>}
      </AnimatePresence>
      <img src={hero} alt="Illustration of a solar roof, batteries, and Bitcoin miners connected together" width={1920} height={1024} className="welcome-hero-image" />
      <motion.div className="welcome-hero-copy relative z-10 mx-auto flex max-w-4xl flex-col items-center px-5 text-center" initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: reduce ? 0 : 1.3 }}>
        <div className="flex items-center gap-2 font-mono text-xs uppercase"><Sun size={15} /> Solar powered. Community owned.</div>
        <h1 className="mt-5 font-display font-semibold">Sunlight in.<br />Bitcoin out.</h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">Fund solar projects. Get HASH.<br />Share the Bitcoin our network mines.</p>
        <Button asChild variant="volt" size="lg" className="mt-7 h-12 gap-6 rounded-md px-6 shadow-none"><Link to="/">Explore projects <ArrowUpRight /></Link></Button>
      </motion.div>
      <div className="welcome-equipment-labels pointer-events-none absolute inset-x-0 bottom-9 mx-auto grid max-w-5xl grid-cols-3 text-center font-mono text-[10px] uppercase md:text-xs"><span>01 / Solar</span><span>02 / Storage</span><span>03 / Mining</span></div>
      <span className="absolute bottom-3 left-5 font-mono text-[9px] text-muted-foreground">SYSTEM ILLUSTRATION</span>
    </section>
  );
}
