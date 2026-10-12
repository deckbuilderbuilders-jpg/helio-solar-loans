import { ArrowUpRight, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { liveTh, useHash } from "@/lib/hash/store";
import { usePool } from "@/lib/hash/usePool";
import { UNBOND_FEE } from "@/lib/hash/curve";
import { Button } from "@/components/ui/button";
import { Ticker } from "./Ticker";

export function NetworkStrip() {
  const { s } = useHash();
  const { data: pool } = usePool();
  return <section className="border-b border-border bg-foreground text-background"><div className="welcome-container py-16 md:py-20"><div className="welcome-kicker text-background/60">THE NETWORK</div><div className="mt-6 grid gap-10 md:grid-cols-2"><h2 className="welcome-heading">Built together.<br />Growing together.</h2><p className="max-w-sm self-end text-base leading-relaxed text-background/60">Solar payments buy more hardware. More hardware adds hashrate. Your HASH stays part of the network.</p></div><dl className="mt-12 grid grid-cols-3 border-y border-background/20">{[["Network hashrate", <><Ticker value={liveTh(s) + (pool?.ok ? pool.hashrateTH : 0)} /> TH</>], ["Projects", <Ticker value={s.projects.length} />], ["Bitcoin to holders", "80%"]].map(([label,value]) => <div key={String(label)} className="min-w-0 border-r border-background/20 py-7 pl-3 first:pl-0 last:border-r-0 md:pl-8"><dd className="font-display text-2xl font-medium md:text-5xl">{value}</dd><dt className="mt-3 text-xs text-background/60 md:text-sm">{label}</dt></div>)}</dl><div className="mt-5 flex items-center justify-between gap-4 font-mono text-[10px] text-background/60"><span>{pool?.ok ? "POOL CONNECTED · LIVE READING" : "POOL NOT CONNECTED · RECORDED NETWORK CAPACITY"}</span><span>80% HOLDERS / 20% DAO</span></div></div></section>;
}

export function ProjectSpotlight() {
  const { s } = useHash();
  const p = s.projects[0];
  if (!p) return null;
  const stateCode = p.place.split(",").at(-1)?.trim() ?? p.place;
  const state = stateCode === "IL" ? "Illinois" : stateCode;
  const availableTh = p.solarKw * 150 / 8;
  return <section className="border-b border-border"><div className="welcome-container grid gap-10 py-16 md:grid-cols-2 md:py-20"><div><div className="welcome-kicker">THE NEXT BUILD</div><h2 className="welcome-heading mt-4">A real project.<br />A bigger network.</h2><p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">Pick the project you want to fund. Each one has its own curve. Your HASH belongs to the whole network.</p></div><Link to="/project/$id" params={{ id: p.id }} className="group block border border-border bg-card p-6 transition-colors hover:border-foreground"><h3 className="font-display text-3xl font-medium">{state}</h3><dl className="mt-8 border-y border-border py-6"><div><dd className="font-mono text-3xl text-foreground">{availableTh.toLocaleString("en-US", { maximumFractionDigits: 2 })} TH</dd><dt className="mt-2 text-muted-foreground">Total available</dt></div></dl><div className="mt-6 flex items-center justify-between text-sm"><span>View project</span><ArrowUpRight size={20} className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" /></div></Link></div></section>;
}

const FAQ = [
  ["What am I buying?", "HASH: a token representing your share of the network’s hashrate. Your USDC buys equipment; it is not a loan that pays back your principal."],
  ["Why do early buyers get more HASH?", "Each project has a bonding curve. As more USDC enters, the price of HASH rises."],
  ["Can I withdraw?", `Before the project fills, you can sell HASH back into its curve for a flat $${UNBOND_FEE.toFixed(2)} fee. Once it fills, the funds go toward the build.`],
  ["When does Bitcoin start coming in?", "When the project is built and its miners are running. Mining rewards vary with network difficulty, uptime, and available power."],
  ["What does the DAO keep?", "20% of mined Bitcoin supports operations. The other 80% goes to HASH holders. Solar REC and rebate payments buy more mining hardware."],
];
export function Faq() {
  return <section className="border-b border-border"><div className="welcome-container grid gap-10 py-16 md:grid-cols-[1fr_1.5fr] md:py-20"><div><div className="welcome-kicker">A FEW ANSWERS</div><h2 className="welcome-heading mt-4">Good questions.</h2></div><div className="border-t border-foreground">{FAQ.map(([q,a]) => <details key={q} className="faq group border-b border-border"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-base font-medium">{q}<Plus className="size-4 shrink-0 transition-transform group-open:rotate-45" /></summary><p className="max-w-lg pb-6 pr-6 text-sm leading-relaxed text-muted-foreground">{a}</p></details>)}</div></div></section>;
}
export function Closing() {
  return <section><div className="welcome-container flex flex-col items-center py-20 text-center md:py-24"><div className="welcome-kicker">LESS TALK. MORE TERAHASH.</div><h2 className="welcome-heading mt-5">Let’s put the sun to work.</h2><Button asChild variant="volt" size="lg" className="mt-8 h-12 gap-6 shadow-none"><Link to="/">Explore projects <ArrowUpRight /></Link></Button></div></section>;
}
