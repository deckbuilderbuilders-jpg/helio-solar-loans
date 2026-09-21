import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BasisLine } from "@/components/helio/Basis";
import { SpecForm } from "@/components/helio/Calculator";
import { Empty, Row, SectionHead, Stat, usd } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ORIGINATOR_TAIL_BPS, PANEL_PRICE_USDC } from "@/lib/helio/constants";
import { underwrite } from "@/lib/helio/panels";
import { useHelio } from "@/lib/helio/store";
import { computeTakeout, type ProjectSpecs } from "@/lib/helio/takeout";

export const Route = createFileRoute("/originate")({
  head: () => ({
    meta: [
      { title: "Originate a job — HELIO" },
      { name: "description", content: "HELIO originator desk: underwrite an Ameren Illinois solar job and publish it for panel bonding." },
      { property: "og:title", content: "Originate a job — HELIO" },
      { property: "og:description", content: "Underwrite and publish an Ameren Illinois solar job." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Originate,
});

function Originate() {
  const { role, originate } = useHelio();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [city, setCity] = useState("Decatur, IL");
  const [address, setAddress] = useState("");
  const [rateClass, setRateClass] = useState<"DS-1" | "DS-2">("DS-1");
  const [specs, setSpecs] = useState<ProjectSpecs>({ kwAc: 10, kwDc: 12, batteryKwh: 0, customerOwned: true, eec: true });

  const u = useMemo(() => {
    try {
      return { ...underwrite(specs, ORIGINATOR_TAIL_BPS), t: computeTakeout(specs), error: null as string | null };
    } catch (e) {
      return null;
    }
  }, [specs]);

  if (role !== "admin") {
    return (
      <Empty
        title="Originator desk is admin-only"
        body="Load the originator admin wallet from the header menu to publish a new Ameren Illinois job."
      />
    );
  }

  const publish = () => {
    const p = originate({
      name,
      city,
      address,
      rateClass,
      specs,
      tradeDate: Math.floor(Date.now() / 1000) - 30 * 86400,
      gate: 2,
    });
    if (p) void navigate({ to: "/project/$id", params: { id: p.id } });
  };

  return (
    <div className="space-y-8">
      <SectionHead eyebrow="Originator desk" title="Publish a job for bonding" />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="panel space-y-5 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Site name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Maple St — Decatur" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ameren rate class</Label>
              <div className="grid grid-cols-2 gap-1 rounded-sm border border-border p-1">
                {(["DS-1", "DS-2"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRateClass(r)}
                    className={`rounded-sm px-2 py-1.5 font-mono text-xs ${rateClass === r ? "bg-volt text-volt-foreground" : "hover:bg-secondary"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Service address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="845 W Maple St, Decatur, IL 62522" />
            </div>
          </div>
          <div>
            <div className="eyebrow mb-2">System specification</div>
            <SpecForm specs={specs} onChange={setSpecs} />
          </div>
        </div>

        <div className="panel space-y-4 p-5">
          <div className="eyebrow">Underwrite preview</div>
          {!u ? (
            <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Specification is out of range for Illinois Shines Group A Distributed Generation.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Funding target" value={usd(u.fundingTarget)} sub="$1.00/W-DC" />
                <Stat label="Panels needed" value={u.panelsRequired} sub={`× $${PANEL_PRICE_USDC}`} />
                <Stat label="Takeout" value={usd(u.takeout)} sub={`${usd(u.takeoutPerPanel)} / panel`} accent />
              </div>
              <div className="divide-y divide-border/60 text-sm">
                <Row label="Ameren rebates" value={usd(u.t.amerenSolarRebate + u.t.amerenBatteryRebate)} />
                <Row label={`First REC payment (${Math.round(u.t.firstPaymentPct * 100)}%)`} value={usd(u.t.firstRecPayment)} />
                <Row label="Collateral lock + reserve" value={`−${usd(u.t.recCollateralLock + u.t.protocolReserve)}`} muted />
                <Row label="Takeout to shares" value={usd(u.takeout)} strong />
                <Row label="80% of 6-yr REC tail to shares" value={usd(u.tailToShares)} muted />
              </div>
              <BasisLine t={u.t} />
              <Button variant="volt" size="lg" className="w-full" disabled={!name.trim()} onClick={publish}>
                Publish job at G2 (ICC Trade Date)
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
