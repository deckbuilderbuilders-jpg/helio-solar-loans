import { Check } from "lucide-react";
import { STAGES } from "@/lib/helio/constants";
import type { Stage } from "@/lib/helio/types";
import { cn } from "@/lib/utils";

export function StageTimeline({ stage, failed, compact }: { stage: Stage; failed?: boolean; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {STAGES.map((g) => (
          <div
            key={g.id}
            title={`${g.code} ${g.title}`}
            className={cn("h-1.5 flex-1 rounded-sm", failed ? "bg-destructive/40" : g.id < stage ? "bg-volt/60" : g.id === stage ? "animate-pulse-volt bg-volt" : "bg-surface-2")}
          />
        ))}
      </div>
    );
  }
  return (
    <ol className="relative">
      {STAGES.map((g, i) => {
        const done = g.id < stage || (stage === 7 && g.id === 7);
        const current = g.id === stage && !done;
        return (
          <li key={g.id} className="relative flex gap-4 pb-5 last:pb-0">
            {i < STAGES.length - 1 && <span className={cn("absolute left-[11px] top-6 h-[calc(100%-8px)] w-px", done ? "bg-volt/50" : "bg-border")} />}
            <span
              className={cn(
                "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-sm border font-mono text-[10px]",
                done && "border-volt bg-volt text-volt-foreground",
                current && (failed ? "border-destructive text-destructive" : "border-volt bg-background text-volt shadow-volt"),
                !done && !current && "border-border bg-surface text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : g.id}
            </span>
            <div className="min-w-0 pt-0.5">
              <div className={cn("flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider", current ? "text-volt" : "text-muted-foreground")}>
                {g.code}
                {current && <span className="rounded-sm bg-volt/15 px-1.5 py-0.5 text-[9px]">{failed ? "failed" : "current"}</span>}
              </div>
              <div className={cn("text-sm", done || current ? "text-foreground" : "text-muted-foreground")}>{g.title}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
