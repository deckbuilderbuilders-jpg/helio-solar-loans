import { Bar, fmt } from "@/components/hash/Shell";
import { asicBadge, projectBadge, stageBadge, type Project } from "@/lib/hash/store";

const STEPS = ["Bond Project", "Project Finalized", "Bond ASICs", "Miners Funded", "Live"];

export function Badge({ children, on }: { children: string; on?: boolean }) {
  return (
    <span className={`rounded-sm border px-2 py-0.5 font-mono text-xs uppercase ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
      {children}
    </span>
  );
}

/** The two curves at a glance: project startup, then miners. */
export function TwoStage({ p }: { p: Project }) {
  const pct = (v: number) => `${Math.floor(v * 100)}%`;
  const a = p.asic;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-md border border-border p-3">
        <div className="flex items-center justify-between text-xs"><span className="eyebrow">1 · Project curve</span><Badge on={p.status === "Bonding"}>{projectBadge(p)}</Badge></div>
        <div className="mt-2 text-sm">Project bonding: <b className="num">{pct(p.raised / p.raise)}</b></div>
        <div className="mt-2"><Bar value={p.raised / p.raise} /></div>
      </div>
      <div className={`rounded-md border p-3 ${a.status === "Bonding" ? "border-primary" : "border-border"}`}>
        <div className="flex items-center justify-between text-xs"><span className="eyebrow">2 · ASIC curve</span><Badge on={a.status === "Bonding"}>{asicBadge(p)}</Badge></div>
        <div className="mt-2 text-sm">
          {a.status === "Closed" ? "ASIC bonding: Not open" : <>ASIC bonding: <b className="num">{pct(a.raised / a.raise)}</b>{a.status === "Bonding" && " — Add miners"}</>}
        </div>
        <div className={`mt-2 ${a.status === "Closed" ? "opacity-30" : ""}`}><Bar value={a.raised / a.raise} /></div>
        <div className="mt-2 text-xs text-muted-foreground">{fmt(a.th, 1)} TH planned</div>
      </div>
    </div>
  );
}

export function StageTrack({ p }: { p: Project }) {
  const cur = stageBadge(p);
  const idx = cur === "Bond Project" ? 0 : cur === "Bond ASICs" ? 2 : cur === "Miners Funded" ? 3 : 4;
  return (
    <ol className="flex flex-wrap gap-2 text-xs">
      {STEPS.map((t, i) => (
        <li key={t} className={`flex items-center gap-2 rounded-full border px-3 py-1 ${i === idx ? "border-primary bg-primary text-primary-foreground" : i < idx ? "border-foreground/40" : "border-border text-muted-foreground"}`}>
          <span className="font-mono">{i < idx ? "✓" : i + 1}</span>{t}
        </li>
      ))}
    </ol>
  );
}
