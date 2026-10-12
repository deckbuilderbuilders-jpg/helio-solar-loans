import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** Number that springs to its value when it scrolls into view and on every change. */
export function Ticker({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  const last = useRef(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) { setN(value); return; }
    const c = animate(last.current, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => { last.current = v; setN(v); } });
    return () => c.stop();
  }, [value, inView, reduce]);
  return <span ref={ref}>{n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
}
