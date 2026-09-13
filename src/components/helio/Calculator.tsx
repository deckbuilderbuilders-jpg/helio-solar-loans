import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { OFFER_GRID, PROTOCOL_FEE_BPS } from "@/lib/helio/constants";
import { FLAGSHIP_SPECS, computeTakeout, quoteLoan, type ProjectSpecs } from "@/lib/helio/takeout";
import { cn } from "@/lib/utils";
import { SourcesPopover } from "./Sources";
import { CompareChip } from "./WhyYield";
import { Row, usd } from "./ui";

type GateRow = (typeof OFFER_GRID)[number];

export function useTakeoutQuote(specs: ProjectSpecs, gate: GateRow) {
  return useMemo(() => {
    try {
      const t = computeTakeout(specs);
      const q = quoteLoan(t.takeout, {
        ltvBps: gate.ltvBps,
        termDays: gate.termDays,
        apyBps: gate.apyBps,
        originationBps: gate.originationBps,
        protocolFeeBps: PROTOCOL_FEE_BPS,
      });
      return { t, q, error: null as string | null };
    } catch (e) {
      return { t: null, q: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [specs, gate]);
}

export function SpecForm({ specs, onChange, compact }: { specs: ProjectSpecs; onChange: (s: ProjectSpecs) => void; compact?: boolean }) {
  const num = (k: "kwAc" | "kwDc" | "batteryKwh") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    onChange({ ...specs, [k]: Number.isFinite(v) ? v : 0 });
  };
  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3")}>
      <Field label="kW AC" hint="REC nameplate">
        <Input type="number" step="0.1" min={0} value={specs.kwAc} onChange={num("kwAc")} className="num" />
      </Field>
      <Field label="kW DC" hint="$1.00/W basis · rebate basis">
        <Input type="number" step="0.1" min={0} value={specs.kwDc} onChange={num("kwDc")} className="num" />
      </Field>
      <Field label="Battery kWh" hint="$300/kWh when paired">
        <Input type="number" step="0.5" min={0} value={specs.batteryKwh} onChange={num("batteryKwh")} className="num" />
      </Field>
      <Toggle label="Customer-owned" hint="+$20/REC · no ITC" checked={specs.customerOwned} onChange={(v) => onChange({ ...specs, customerOwned: v })} />
      <Toggle label="EEC installer" hint="+$5/REC" checked={specs.eec} onChange={(v) => onChange({ ...specs, eec: v })} />
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}
function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-sm border px-3 py-2.5 transition-colors", checked ? "border-volt/50 bg-volt/5" : "border-border")}>
      <span>
        <span className="block text-sm">{label}</span>
        <span className="block text-[10px] text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function GatePicker({ value, onChange }: { value: GateRow; onChange: (g: GateRow) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-sm border border-border p-1">
      {OFFER_GRID.map((g) => (
        <button
          key={g.gate}
          onClick={() => onChange(g)}
          className={cn("rounded-sm px-2 py-1.5 text-left transition-colors", value.gate === g.gate ? "bg-volt text-volt-foreground" : "hover:bg-secondary")}
        >
          <div className="font-mono text-[11px] uppercase">G{g.gate} · {g.termDays}d</div>
          <div className="num text-sm font-medium">{g.apyBps / 100}% · {g.ltvBps / 100}% LTV</div>
        </button>
      ))}
    </div>
  );
}

export function TakeoutCalculator({ initial = FLAGSHIP_SPECS }: { initial?: ProjectSpecs }) {
  const [specs, setSpecs] = useState<ProjectSpecs>(initial);
  const [gate, setGate] = useState<GateRow>(OFFER_GRID[1]);
  const { t, q, error } = useTakeoutQuote(specs, gate);

  return (
    <div className="panel grid gap-0 md:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5 border-b border-border p-5 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between">
          <div className="eyebrow">Project inputs</div>
          <SourcesPopover />
        </div>
        <SpecForm specs={specs} onChange={setSpecs} compact />
        <div>
          <div className="eyebrow mb-2">Origination gate</div>
          <GatePicker value={gate} onChange={setGate} />
        </div>
        {t && (
          <div className="rounded-sm bg-surface p-3 text-[11px] leading-relaxed text-muted-foreground">
            REC price: <span className="num text-foreground">${t.basePrice.toFixed(2)}</span> Group A {t.tierLabel}
            {t.customerOwnedAdder > 0 && <> + <span className="num text-foreground">$20</span> customer-owned</>}
            {t.eecAdder > 0 && <> + <span className="num text-foreground">$5</span> EEC</>}
            {" = "}<span className="num text-volt">${t.effectivePrice.toFixed(2)} / REC</span>.
            {" "}Year-1 RECs <span className="num text-foreground">{t.year1Recs.toFixed(2)}</span> → 15-yr contract <span className="num text-foreground">{t.totalRecs}</span> RECs
            {" "}({t.isSmallDg ? "Small DG · 50% at Part II" : "Large DG · 15% at Part II"}).
            {t.amerenSolarRebate > 0 && <> Ameren rebate elected → supply + transmission-only net metering.</>}
          </div>
        )}
      </div>

      <div className="p-5">
        {error && <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        {t && q && (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <Big label="Install cost" value={usd(t.installCost)} sub={`${t.specs.kwDc} kW-DC × $1.00/W`} />
              <Big label="Takeout" value={usd(t.takeout)} sub="contracted cash" />
              <Big label={`${gate.termDays}-day loan`} value={usd(q.principal)} sub={`${gate.ltvBps / 100}% LTV · ${gate.apyBps / 100}% APY`} accent />
            </div>
            <div className="divide-y divide-border/60 text-sm">
              <Row label="Ameren solar rebate" sub={`${t.specs.kwDc} kW-DC × $300`} value={usd(t.amerenSolarRebate)} />
              {t.amerenBatteryRebate > 0 && <Row label="Ameren battery rebate" sub={`${t.specs.batteryKwh} kWh × $300`} value={usd(t.amerenBatteryRebate)} />}
              <Row label={`First REC payment (${Math.round(t.firstPaymentPct * 100)}%)`} sub={`${t.totalRecs} RECs × $${t.effectivePrice.toFixed(2)} = ${usd(t.recPurchaseAmount)}`} value={usd(t.firstRecPayment)} />
              <Row label="REC-contract collateral lock (5%)" value={`−${usd(t.recCollateralLock)}`} muted />
              <Row label="Protocol haircut reserve (3%)" value={`−${usd(t.protocolReserve)}`} muted />
              <Row label="Takeout" value={usd(t.takeout)} strong />
            </div>
            <div className="mt-4 divide-y divide-border/60 text-sm">
              <Row label={`Principal at ${gate.ltvBps / 100}% LTV`} value={usd(q.principal)} />
              <Row label={`Interest · ${gate.apyBps / 100}% × ${gate.termDays}/365`} value={usd(q.interest)} />
              <Row label={`Origination ${gate.originationBps / 100}% (at close)`} value={usd(q.origination)} muted />
              <Row label="Borrower cash at close" value={usd(q.borrowerNetAtOrigination)} />
              <Row label="Borrower residual after takeout repays" value={usd(q.borrowerResidualAfterTakeout)} strong />
              <Row label="6-year REC tail kept by AV (not lent)" sub="24 quarterly payments" value={usd(t.recTail)} muted />
            </div>
            <CompareChip apyBps={gate.apyBps} termDays={gate.termDays} className="mt-4" />
          </>
        )}
      </div>
    </div>
  );
}

function Big({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-sm border p-3", accent ? "border-volt/50 bg-volt/10" : "border-border bg-surface")}>
      <div className="eyebrow">{label}</div>
      <div className={cn("num mt-1 text-xl font-medium md:text-2xl", accent && "text-volt")}>{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
