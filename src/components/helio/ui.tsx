import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Gate, LoanState } from "@/lib/helio/types";
import { GATES } from "@/lib/helio/constants";

export const usd = (n: number, digits = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
export const usdc = (n: number, digits = 2) =>
  `${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })} USDC`;
export const pct = (bps: number, digits = 0) => `${(bps / 100).toFixed(digits)}%`;
export const days = (sec: number) => `${Math.round(sec / 86400)}d`;
export const dateShort = (sec: number) =>
  new Date(sec * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function countdown(seconds: number): string {
  if (seconds <= 0) return "0h";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${seconds % 60}s`;
}

export function Stat({ label, value, sub, className, accent }: { label: string; value: ReactNode; sub?: ReactNode; className?: string; accent?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="eyebrow">{label}</span>
      <span className={cn("num text-2xl font-medium leading-none", accent && "text-volt")}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function Row({ label, value, sub, strong, muted }: { label: ReactNode; value: ReactNode; sub?: ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-1.5", strong && "border-t border-border pt-3 mt-1")}>
      <div className="min-w-0">
        <div className={cn("text-sm", muted ? "text-muted-foreground" : "text-foreground", strong && "font-medium")}>{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </div>
      <div className={cn("num shrink-0 text-sm", strong && "text-base font-medium text-volt", muted && "text-muted-foreground")}>{value}</div>
    </div>
  );
}

const stateStyles: Record<LoanState | "Open" | "Taken" | "Cancelled", string> = {
  Active: "bg-volt/15 text-volt border-volt/40",
  Extended: "bg-warning/15 text-warning border-warning/40",
  Repaid: "bg-positive/15 text-positive border-positive/40",
  Defaulted: "bg-destructive/15 text-destructive border-destructive/40",
  Foreclosed: "bg-muted text-muted-foreground border-border",
  Open: "bg-volt/15 text-volt border-volt/40",
  Taken: "bg-muted text-muted-foreground border-border",
  Cancelled: "bg-muted text-muted-foreground border-border",
};

export function Pill({ state, className }: { state: keyof typeof stateStyles; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider", stateStyles[state], className)}>
      {(state === "Active" || state === "Open") && <span className="size-1.5 rounded-full bg-current animate-pulse-volt" />}
      {state}
    </span>
  );
}

export function GateChip({ gate, className }: { gate: Gate; className?: string }) {
  const g = GATES[gate];
  return (
    <span title={g.title} className={cn("inline-flex items-center rounded-sm border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-foreground", className)}>
      {g.code}
    </span>
  );
}

export function Empty({ title, body, cta }: { title: string; body: string; cta?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="hazard h-1.5 w-24 opacity-70" />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {cta}
    </div>
  );
}

export function SectionHead({ eyebrow, title, right }: { eyebrow?: string; title: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h2 className="text-xl font-medium md:text-2xl">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function ProjectLink({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Link to="/project/$id" params={{ id }} className="underline-offset-4 hover:text-volt hover:underline">
      {children}
    </Link>
  );
}
export function LoanLink({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Link to="/loan/$id" params={{ id }} className="underline-offset-4 hover:text-volt hover:underline">
      {children}
    </Link>
  );
}
