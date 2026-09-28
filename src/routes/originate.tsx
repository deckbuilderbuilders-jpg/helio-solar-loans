import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { EconomicsTable } from "@/components/helio/Economics";
import { SectionHead, usd } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APR_FLOOR } from "@/lib/helio/auction";
import { batteryForSize, projectEconomics } from "@/lib/helio/economics";
import { useHelio } from "@/lib/helio/store";

export const Route = createFileRoute("/originate")({
  head: () => ({
    meta: [
      { title: "Create a roof — HELIO" },
      { name: "description", content: "Open a HELIO bridge note by paying the $20/kW Illinois Shines application fee. Earn 3x cash at takeout plus a 2x Yield NFT." },
      { property: "og:title", content: "Create a roof — HELIO" },
      { property: "og:description", content: "Pay the application fee, open the auction, earn 3x + 2x." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Create,
});

function Create() {
  const { wallet, createNote } = useHelio();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", city: "Springfield, IL", address: "", kwAc: 10, kwDc: 10, batteryKwh: 64 });
  const e = useMemo(() => projectEconomics(f.kwDc || 0, f.batteryKwh || 0), [f.kwDc, f.batteryKwh]);
  const set = (k: keyof typeof f) => (ev: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: typeof f[k] === "number" ? parseFloat(ev.target.value) || 0 : ev.target.value });

  return (
    <div className="space-y-8">
      <SectionHead eyebrow="Permissionless" title="Create a roof" right={<span className="max-w-sm text-xs text-muted-foreground">Your fee is the only money at risk. If the auction never fills, it's gone and lenders get every dollar back.</span>} />
      <div className="panel grid gap-4 p-5 md:grid-cols-3">
        <Field label="Site name"><Input value={f.name} onChange={set("name")} placeholder="Elm St — Peoria" /></Field>
        <Field label="City"><Input value={f.city} onChange={set("city")} /></Field>
        <Field label="Address"><Input value={f.address} onChange={set("address")} /></Field>
        <Field label="kW AC (≤ 25)"><Input type="number" value={f.kwAc} onChange={set("kwAc")} /></Field>
        <Field label="kW DC"><Input type="number" value={f.kwDc} onChange={(ev) => { const v = parseFloat(ev.target.value) || 0; setF({ ...f, kwDc: v, batteryKwh: batteryForSize(v) }); }} /></Field>
        <Field label="Storage kWh (6.4/kW default)"><Input type="number" value={f.batteryKwh} onChange={set("batteryKwh")} /></Field>
      </div>
      <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="text-sm">
          Application fee <span className="num text-volt">{usd(e.applicationFee)}</span> → <span className="num">{usd(e.creatorCashBack)}</span> cash at takeout +{" "}
          <span className="num">{usd(e.creatorYieldCredit)}</span> Yield NFT weight. Auction opens at {APR_FLOOR * 100}% for a {usd(e.buildCost)} note.
        </div>
        <Button
          variant="volt"
          disabled={!wallet}
          onClick={() => {
            const n = createNote(f);
            if (n) nav({ to: "/project/$id", params: { id: n.id } });
          }}
        >
          {wallet ? `Pay ${usd(e.applicationFee)} and open auction` : "Connect a wallet"}
        </Button>
      </div>
      {f.kwDc > 0 && <div className="panel p-5"><EconomicsTable e={e} apr={APR_FLOOR} /></div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
