import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUpRight, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/welcome-network.jpg";

export function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="welcome-hero relative border-b border-border">
      <img src={hero} alt="Illustration of a solar roof, batteries, and Bitcoin miners connected together" width={1920} height={1024} className="welcome-hero-image" />
      <motion.div className="welcome-hero-copy relative z-10 mx-auto flex max-w-4xl flex-col items-center px-5 text-center" initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <div className="flex items-center gap-2 font-mono text-xs uppercase"><Sun size={15} /> Solar powered. Community owned.</div>
        <h1 className="mt-5 font-display font-semibold">Sunlight in.<br />Bitcoin out.</h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">Fund solar projects. Get HASH.<br />Share the Bitcoin our network mines.</p>
        <Button asChild variant="volt" size="lg" className="mt-7 h-12 gap-6 rounded-md px-6 shadow-none"><Link to="/">Explore projects <ArrowUpRight /></Link></Button>
      </motion.div>
      <div className="welcome-equipment-labels pointer-events-none absolute inset-x-0 bottom-9 mx-auto grid max-w-5xl grid-cols-3 text-center font-mono text-[10px] uppercase md:text-xs"><span>01 / Solar</span><span>02 / Storage</span><span>03 / Mining</span></div>
      <a href="#how-it-works" className="absolute bottom-8 right-6 hidden items-center gap-2 font-mono text-xs md:flex">The process <ArrowDown size={14} /></a>
      <span className="absolute bottom-3 left-5 font-mono text-[9px] text-muted-foreground">SYSTEM ILLUSTRATION</span>
    </section>
  );
}
