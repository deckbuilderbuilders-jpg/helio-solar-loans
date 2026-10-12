import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function Reveal({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return <motion.div initial={reduce ? false : { opacity: 0, y: 48 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}