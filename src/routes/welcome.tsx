import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Sun } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Hero } from "@/components/welcome/Hero";
import { Pipeline } from "@/components/welcome/Pipeline";
import { Flow, Trust } from "@/components/welcome/Flow";
import { CurveChart } from "@/components/welcome/CurveChart";
import { Closing, Faq, NetworkStrip, ProjectSpotlight } from "@/components/welcome/Proof";
import { Reveal } from "@/components/welcome/Reveal";
import { Loader } from "@/components/welcome/Loader";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [
    { title: "HELIO — Sunlight in. Bitcoin out." },
    { name: "description", content: "Fund solar projects. Get HASH. Share the Bitcoin mined by a community-owned solar mining network." },
    { property: "og:title", content: "HELIO — Sunlight in. Bitcoin out." },
    { property: "og:description", content: "Fund solar projects. Get HASH. Share the Bitcoin our network mines." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Welcome,
});
function Welcome() {
  useEffect(() => { try { localStorage.setItem("helio.welcomed", "1"); } catch { /* storage unavailable */ } }, []);
  return <div className="welcome-page">
    <Loader />
    <header className="relative z-20 border-b border-border"><div className="welcome-container flex h-20 items-center justify-between"><Link to="/welcome" className="flex items-center gap-2 font-display text-2xl font-bold" aria-label="HELIO home"><Sun size={25} strokeWidth={2} />HELIO</Link><span className="hidden font-mono text-[10px] uppercase text-muted-foreground sm:block">A SOLAR BITCOIN DAO</span><Button asChild variant="ghost" className="gap-3 px-0 hover:bg-transparent"><Link to="/">Enter app <ArrowUpRight /></Link></Button></div></header>
    <main><Hero /><div className="border-b border-foreground/20 bg-volt text-volt-foreground"><div className="welcome-container grid grid-cols-3 divide-x divide-foreground/20 py-5 text-center font-mono text-xs uppercase md:text-sm"><span className="px-2">Real equipment</span><span className="px-2">One shared network</span><span className="px-2">80% to holders</span></div></div><Reveal><Flow /></Reveal><Pipeline /><Reveal><Trust /></Reveal><Reveal><ProjectSpotlight /></Reveal>
    <Reveal><section id="calc" className="scroll-mt-8 border-b border-border"><div className="welcome-container py-16 md:py-20"><div className="welcome-kicker">THE BONDING CURVE</div><div className="mt-4 flex flex-wrap items-end justify-between gap-5"><h2 className="welcome-heading">Early in. More HASH.</h2><p className="max-w-xs text-sm text-muted-foreground">Same project. Same network.<br />A better price for the first buyers.</p></div><div className="mt-10"><CurveChart /></div></div></section></Reveal>
    <Reveal><NetworkStrip /></Reveal><Reveal><Faq /></Reveal><Reveal><Closing /></Reveal></main>
    <footer className="border-t border-border"><div className="welcome-container flex flex-wrap items-center justify-between gap-4 py-6"><span className="font-display text-lg font-semibold">HELIO</span><span className="font-mono text-[10px] text-muted-foreground">SUNLIGHT IN. BITCOIN OUT.</span><span className="font-mono text-[10px] text-muted-foreground">DEVNET · EQUIPMENT FUNDING SIMULATION</span></div></footer>
  </div>;
}
