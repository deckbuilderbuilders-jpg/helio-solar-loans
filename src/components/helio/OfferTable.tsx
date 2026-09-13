import type { ReactNode } from "react";
import { short } from "@/lib/helio/ledger";
import type { Offer } from "@/lib/helio/types";
import { cn } from "@/lib/utils";
import { GateChip, Pill, days, dateShort, pct, usdc } from "./ui";

export function OfferTable({
  offers,
  action,
  highlightId,
  emptyText = "No open offers on this collection yet.",
}: {
  offers: Offer[];
  action?: (o: Offer) => ReactNode;
  highlightId?: string | null;
  emptyText?: string;
}) {
  if (offers.length === 0) return <div className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyText}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2 font-normal">Principal</th>
            <th className="px-2 py-2 font-normal">APY</th>
            <th className="px-2 py-2 font-normal">Term</th>
            <th className="px-2 py-2 font-normal">Min gate</th>
            <th className="px-2 py-2 font-normal">Orig.</th>
            <th className="hidden px-2 py-2 font-normal md:table-cell">Lender</th>
            <th className="hidden px-2 py-2 font-normal lg:table-cell">Posted</th>
            <th className="px-2 py-2 font-normal">State</th>
            {action && <th className="px-4 py-2" />}
          </tr>
        </thead>
        <tbody>
          {offers.map((o) => (
            <tr key={o.id} className={cn("border-b border-border/60 transition-colors hover:bg-surface-2/60", highlightId === o.id && "bg-volt/5")}>
              <td className="num px-4 py-2.5 font-medium">{usdc(o.principal, 0)}</td>
              <td className="num px-2 py-2.5 text-volt">{pct(o.apyBps)}</td>
              <td className="num px-2 py-2.5">{days(o.termSeconds)}</td>
              <td className="px-2 py-2.5"><GateChip gate={o.minGate} /></td>
              <td className="num px-2 py-2.5 text-muted-foreground">{pct(o.originationBps, 1)}</td>
              <td className="hidden px-2 py-2.5 font-mono text-xs text-muted-foreground md:table-cell">{short(o.lender)}</td>
              <td className="hidden px-2 py-2.5 text-xs text-muted-foreground lg:table-cell">{dateShort(o.createdAt)}</td>
              <td className="px-2 py-2.5"><Pill state={o.state} /></td>
              {action && <td className="px-4 py-2.5 text-right">{action(o)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
