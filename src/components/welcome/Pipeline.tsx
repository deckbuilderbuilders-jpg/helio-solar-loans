import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, Banknote, Hammer, Sun, Cpu, Bitcoin } from "lucide-react";
import network from "@/assets/welcome-network.jpg";

export const STEPS = [
  ["Bond", "Choose a project. Bond USDC and receive HASH. Early buyers get more HASH."],
  ["Build", "Once the project fills, we buy and install solar, batteries, and miners."],
  ["Power", "Solar and batteries power the machines. No hardware to manage yourself."],
  ["Mine", "The miners join one network. HASH represents your share of its hashrate."],
  ["Earn", "80% of mined Bitcoin goes to HASH holders. The DAO keeps 20% to operate."],
] as const;
const ICONS = [Banknote, Hammer, Sun, Cpu, Bitcoin];
const CALLOUTS = ["USDC → HASH", "SOLAR + STORAGE + MINERS", "SUNLIGHT → ELECTRICITY", "ONE SHARED HASHRATE", "80% HOLDERS / 20% DAO"];

export function Pipeline() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const preference = useReducedMotion();
  const [reduce, setReduce] = useState(false);
  useEffect(() => setReduce(Boolean(preference)), [preference]);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(Math.min(4, Math.max(0, Math.floor(v * 5)))));
  const step = STEPS[active] ?? STEPS[0];
  const Icon = ICONS[active] ?? Sun;
  return (
    <section ref={ref} id="how-it-works" className={`welcome-process border-b border-border ${reduce ? "welcome-process-static" : ""}`} aria-label="How HELIO works">
      {reduce ? <div className="welcome-container py-16"><div className="welcome-kicker">THE PROCESS / 01—05</div><h2 className="welcome-heading mt-4">Your dollars. Real machines.</h2>{STEPS.map(([title, text], i) => <div key={title} className="border-b border-border py-8"><span className="welcome-kicker">0{i + 1}</span><h3 className="welcome-heading mt-2">{title}</h3><p className="mt-4 max-w-xl">{text}</p></div>)}</div> :
      <div className="welcome-process-screen">
        <div className="welcome-container welcome-process-inner">
          <div className="flex items-center justify-between gap-4"><span className="welcome-kicker">YOUR DOLLARS. REAL MACHINES.</span><span className="welcome-kicker">0{active + 1} / 05</span></div>
          <ol className="welcome-process-track mt-5 grid grid-cols-5 border-y border-border" aria-label="Process progress">
            {STEPS.map(([title], i) => <li key={title} aria-current={active === i ? "step" : undefined} className={`welcome-process-label ${active === i ? "is-current" : ""}`}><span className="font-mono">0{i + 1}</span><span>{title}</span></li>)}
            <motion.div className="welcome-process-progress" style={{ scaleX }} />
          </ol>
          <div className="welcome-process-stage">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={active} className="welcome-process-copy" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.3 }}>
                <span className="welcome-step-icon"><Icon size={32} strokeWidth={1.5} /></span>
                <h2 className="welcome-heading mt-5">{step[0]}.</h2>
                <p className="mt-5 max-w-lg">{step[1]}</p>
              </motion.div>
            </AnimatePresence>
            <div className={`welcome-process-art welcome-art-${active}`} aria-hidden="true">
              <motion.img src={network} alt="" animate={{ x: active === 1 ? "5%" : active === 3 ? "-5%" : "0%", scale: active === 1 || active === 3 ? 1.1 : 1 }} transition={{ duration: 0.8 }} />
              <div className="welcome-energy-track"><span /><span /><span /></div>
              <AnimatePresence mode="wait"><motion.div key={active} className="welcome-art-caption" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>{CALLOUTS[active]}</motion.div></AnimatePresence>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4"><span className="welcome-kicker">SUNLIGHT IN. BITCOIN OUT.</span><span className="welcome-scroll-cue font-mono">{active === 4 ? "Continue" : "Scroll"}<ArrowDown size={16} /></span></div>
        </div>
      </div>}
    </section>
  );
}
