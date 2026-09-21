import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ORIGINATOR_TAIL_BPS, PANEL_PRICE_USDC } from "@/lib/helio/constants";
import { underwrite, type Underwrite } from "@/lib/helio/panels";
import { FLAGSHIP_SPECS, computeTakeout, type ProjectSpecs, type TakeoutBreakdown } from "@/lib/helio/takeout";
import { cn } from "@/lib/utils";
import { BasisLine } from "./Basis";
import { SourcesPopover } from "./Sources";
import { Row, usd } from "./ui";

export function useUnderwrite(specs: ProjectSpecs): { t: TakeoutBreakdown | null; u: Underwrite | null; error: string | null } {
  return useMemo(() => {
    try {
      return { t: computeTakeout(specs), u: underwrite(specs, ORIGINATOR_TAIL_BPS), error: null };
    } catch (e) {
      return { t: null, u: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [specs]);
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
      <Field label="kW DC" hint="$1.00/W cost · rebate basis">
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

/** Project underwriting — funding target, panels needed, takeout per panel. */
export function UnderwritingCalculator({ initial = FLAGSHIP_SPECS }: { initial?: ProjectSpecs }) {
  const [specs, setSpecs] = useState<ProjectSpecs>(initial);
  const { t, u, error } = useUnderwrite(specs);

  return (
    <div className="panel grid gap-0 md:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5 border-b border-border p-5 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between">
          <div className="eyebrow">Project underwriting</div>
          <SourcesPopover />
        </div>
        <SpecForm specs={specs} onChange={setSpecs} compact />
        {t && <BasisLine t={t} className="rounded-sm bg-surface p-3" />}
      </div>

      <div className="p-5">
        {error && <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        {t && u && (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <Big label="Funding target" value={usd(u.fundingTarget)} sub={`${specs.kwDc} kW-DC × $1.00/W`} />
              <Big label="Panels needed" value={String(u.panelsRequired)} sub={`400 W each · $${PANEL_PRICE_USDC}`} />
              <Big label="Takeout per panel" value={usd(u.takeoutPerPanel, 2)} sub="rebate + first REC" accent />
            </div>
            <div className="divide-y divide-border/60 text-sm">
              <Row label="Ameren solar rebate" sub={`${specs.kwDc} kW-DC × $300`} value={usd(t.amerenSolarRebate)} />
              {t.amerenBatteryRebate > 0 && <Row label="Ameren battery rebate" sub={`${specs.batteryKwh} kWh × $300`} value={usd(t.amerenBatteryRebate)} />}
              <Row
                label={`First REC payment (${Math.round(t.firstPaymentPct * 100)}%)`}
                sub={`${t.totalRecs} RECs × $${t.effectivePrice.toFixed(2)} = ${usd(t.recPurchaseAmount)}`}
                value={usd(t.firstRecPayment)}
              />
              <Row label="REC-contract collateral lock (5%)" value={`−${usd(t.recCollateralLock)}`} muted />
              <Row label="Protocol haircut reserve (3%)" value={`−${usd(t.protocolReserve)}`} muted />
              <Row label="Takeout to Project Shares" value={usd(t.takeout)} strong />
            </div>
            <div className="mt-4 divide-y divide-border/60 text-sm">
              <Row label="6-year REC tail (24 quarters)" sub="80% shares / 20% HELIO originator" value={usd(t.recTail)} muted />
              <Row label="Tail to shares" value={usd(u.tailToShares)} />
              <Row label="Per panel, takeout + tail" sub={`against a $${PANEL_PRICE_USDC} mint`} value={`${usd(u.totalPerPanel, 2)} · ${u.multiple.toFixed(2)}×`} strong />
            </div>
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
