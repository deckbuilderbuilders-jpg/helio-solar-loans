import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sun } from "lucide-react";

const WORDS = ["SUNLIGHT IN", "BITCOIN OUT", "HELIO"];

export function Loader() {
  const [done, setDone] = useState(false);
  const [word, setWord] = useState(0);

  useEffect(() => {
    const w = setInterval(() => setWord((i) => Math.min(i + 1, WORDS.length - 1)), 450);
    const t = setTimeout(() => setDone(true), 1500);
    return () => { clearInterval(w); clearTimeout(t); };
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
          exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
          aria-hidden
        >
          <div className="flex items-center gap-3 font-display text-4xl font-bold md:text-5xl">
            <Sun size={40} strokeWidth={2} className="text-volt" />
            HELIO
          </div>
          <div className="mt-6 h-6 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <AnimatePresence mode="wait">
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="block"
              >
                {WORDS[word]}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="mt-8 h-px w-48 overflow-hidden bg-foreground/15">
            <motion.div
              className="h-full bg-volt"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.3, ease: "easeInOut" }}
              style={{ transformOrigin: "left" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
