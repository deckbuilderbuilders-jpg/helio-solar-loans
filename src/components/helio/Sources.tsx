import { BookOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const SOURCES = [
  {
    title: "Illinois Shines 2026–27 Program Guidebook — REC prices",
    note: "Group A (Ameren / MISO) Distributed Generation: $70.37 (0–10 kW AC), $60.92 (>10–25), $59.53 (>25–100) … $31.96 (>2000–5000). Customer-owned Small DG +$20, EEC +$5.",
  },
  {
    title: "Illinois Shines 15-year REC contract — payment schedule",
    note: "Small DG (≤25 kW AC): 50% at Energization / Part II, remainder ratably over 24 quarters. Large DG: 15% up front. 5% of REC Purchase Amount held as collateral.",
  },
  {
    title: "Illinois Shines — REC quantity",
    note: "Contract quantity = kW AC × 16.42% capacity factor × 8,760 h, degraded 0.5%/yr over 15 years, rounded down.",
  },
  {
    title: "Ameren Illinois smart-inverter rebate (DS-1 / DS-2)",
    note: "$300 per kW-DC solar; $300 per kWh usable battery when paired with qualifying solar. Paid ~60 calendar days after complete post-PTO application. Electing the rebate moves the account to supply + transmission net metering.",
  },
  {
    title: "Illinois Shines — energization deadline",
    note: "Small DG projects must energize within 18 months of the Trade Date (extensions available for utility delay).",
  },
];

export function SourcesPopover({ className, label = "Sources" }: { className?: string; label?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn("inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:border-volt/50 hover:text-volt", className)}>
          <BookOpen className="size-3" /> {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[92vw] p-0">
        <div className="border-b border-border px-4 py-2">
          <div className="eyebrow">Illinois sources encoded in the engine</div>
        </div>
        <ul className="max-h-96 divide-y divide-border overflow-auto">
          {SOURCES.map((s) => (
            <li key={s.title} className="px-4 py-3">
              <div className="text-sm font-medium">{s.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.note}</div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
