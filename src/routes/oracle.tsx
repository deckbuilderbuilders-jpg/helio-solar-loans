import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Empty, NoteLink, Pill, SectionHead, Stat, StageChip, dateShort, usd } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { econOf, lenderDue, noteStatus, short } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";
import type { HelioNote } from "@/lib/helio/types";

export const Route = createFileRoute("/oracle")({
  head: () => ({
    meta: [
      { title: "Oracle console — HELIO" },
      { name: "description", content: "Admin console: mark builds, record PTO, settle Ameren + Illinois Shines takeout and pay REC tail quarters." },
      { property: "og:title", content: "Oracle console — HELIO" },
      { property: "og:description", content: "Advance notes and inject takeout and tail USDC for the demo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Oracle,
});

function Oracle() {
  const { state, role, connect } = useHelio();
  if (role !== "admin") {
    return <Empty title="Oracle console is admin-only" body="The oracle writes build, PTO, takeout and tail events so the demo never depends on Illinois servers." cta={<Button variant="volt" onClick={() => connect("admin")}>Load oracle admin</Button>} />;
  }
  const b = state.balances;
  return (
    <div className="space-y-8">
      <SectionHead eyebrow="Admin" title="Oracle console" />
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
        <Stat label="HELIO treasury" value={usd(b[state.config.treasury] ?? 0)} sub="fees, exit fees, surplus, 28% tail" />
        <Stat label="Installer" value={usd(b[state.config.installer] ?? 0)} sub="base + bonus + 7% tail" />
        <Stat label="Notes" value={state.notes.length} />
      </div>
      <div className="space-y-4">{state.notes.map((n) => <NoteOps key={n.id} n={n} />)}</div>
      <section>
        <SectionHead eyebrow="Log" title="Recent instructions" />
        <div className="panel max-h-96 divide-y divide-border overflow-auto">
          {state.log.slice(0, 60).map((l) => (
            <div key={l.id} className="px-4 py-2 text-xs">
              <span className="font-mono text-volt">{l.ix}</span> <span className="text-muted-foreground">{short(l.signer)} · {dateShort(l.at)}</span>
              <div>{l.detail}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function NoteOps({ n }: { n: HelioNote }) {
  const { now, failNote, markBuilt, markPto, recordTakeout, recordTail } = useHelio();
  const e = econOf(n);
  const [dayOne, setDayOne] = useState(true);
  const [takeout, setTakeout] = useState(String(Math.round(e.takeout)));
  const quarter = e.recTailPerQuarter;
  return (
    <div className="panel flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2"><StageChip stage={n.stage} /><Pill state={noteStatus(n)} /></div>
        <NoteLink id={n.id}>{n.name}</NoteLink>
        <div className="text-[11px] text-muted-foreground">{usd(e.buildCost)} note · lenders due {usd(lenderDue(n, now).total)}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {n.failed ? <span className="text-xs text-muted-foreground">Failed</span> : null}
        {!n.failed && n.stage === 1 && <Button size="sm" variant="secondary" onClick={() => failNote(n.id)}>Fail auction (refund lenders)</Button>}
        {!n.failed && n.stage === 2 && (
          <>
            <label className="flex items-center gap-2 text-xs"><Switch checked={dayOne} onCheckedChange={setDayOne} /> one-day install</label>
            <Button size="sm" variant="volt" onClick={() => markBuilt(n.id, dayOne)}>Mark built</Button>
          </>
        )}
        {n.stage === 3 && <Button size="sm" variant="volt" onClick={() => markPto(n.id)}>Record PTO</Button>}
        {n.stage === 4 && (
          <>
            <Input className="h-8 w-28" type="number" value={takeout} onChange={(ev) => setTakeout(ev.target.value)} aria-label="Takeout amount" />
            <Button size="sm" variant="volt" onClick={() => recordTakeout(n.id, parseFloat(takeout))}>Settle takeout</Button>
          </>
        )}
        {(n.stage === 5 || n.stage === 6) && <Button size="sm" variant="volt" onClick={() => recordTail(n.id, quarter)}>Pay tail Q{n.tailQuarters + 1} ({usd(quarter)})</Button>}
      </div>
    </div>
  );
}
