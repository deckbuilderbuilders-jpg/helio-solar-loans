import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { ArrowRight, Banknote, Hammer, Sun, Cpu, Bitcoin } from "lucide-react";
import { Button } from "@/components/ui/button";

export const STEPS = [
  ["Bond", "Choose a project. Bond USDC and receive HASH. Early buyers get more HASH."],
  ["Build", "Once the project fills, we buy and install solar, batteries, and miners."],
  ["Power", "Solar and batteries power the machines. No hardware to manage yourself."],
  ["Mine", "The miners join one network. HASH represents your share of its hashrate."],
  ["Earn", "80% of mined Bitcoin goes to HASH holders. The DAO keeps 20% to operate."],
] as const;
const ICONS = [Banknote, Hammer, Sun, Cpu, Bitcoin];

export function Pipeline() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  return (
    <section id="how-it-works" className="scroll-mt-8 border-b border-border">
      <div className="welcome-container py-16 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="welcome-kicker">THE PROCESS / 01—05</div><h2 className="welcome-heading mt-4">Your dollars. Real machines.</h2></div><p className="max-w-xs text-sm text-muted-foreground">From a solar project to your share of the Bitcoin.</p></div>
        <ol className="mt-10 grid grid-cols-5 border-y border-border">
          {STEPS.map(([title], i) => { const Icon = ICONS[i]; return <li key={title} className="min-w-0 border-r border-border last:border-r-0"><Button variant="ghost" onClick={() => setActive(i)} aria-pressed={active === i} className={`welcome-station relative flex h-36 w-full flex-col gap-3 whitespace-normal rounded-none px-1 md:h-44 ${active === i ? "bg-secondary" : ""}`}><span className="absolute left-3 top-3 font-mono text-[10px] text-muted-foreground">0{i + 1}</span><Icon className="!size-7 md:!size-9" strokeWidth={1.25} /><span className="font-display text-sm md:text-xl">{title}</span>{active === i && <motion.span layoutId={reduce ? undefined : "station-line"} className="absolute inset-x-0 bottom-0 h-0.5 bg-volt" />}</Button></li>; })}
        </ol>
        <div className="mt-6 flex min-h-16 items-start gap-4"><ArrowRight size={18} className="mt-0.5 shrink-0" /><motion.p key={active} initial={reduce ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl text-sm leading-relaxed text-muted-foreground">{STEPS[active][1]}</motion.p></div>
      </div>
    </section>
  );
}
