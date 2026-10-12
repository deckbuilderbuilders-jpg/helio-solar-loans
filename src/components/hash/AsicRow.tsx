import { useState } from "react";
import { Bar, fmt, usd } from "@/components/hash/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { asicById } from "@/lib/hash/asics";
import { HASH_PER_TH, UNBOND_FEE, curveFor, hashOut, usdBack } from "@/lib/hash/curve";
import { ME, statusLabel, useHash, type AsicCurve } from "@/lib/hash/store";

export function AsicRow({ a }: { a: AsicCurve }) {
  const { s, bondAsic, unbondAsic, asicLiveNow } = useHash();
  const [amt, setAmt] = useState("100");
  const m = asicById(a.modelId);
  const c = curveFor(a.raise, a.th);
  const n = Math.max(0, Number(amt) || 0);
  const mine = a.holders[ME] ?? 0;
  const share = mine / (a.th * HASH_PER_TH);
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold">{m.model} · {a.th} TH</div>
        <span className="rounded-sm border border-border px-2 py-0.5 font-mono text-xs uppercase">{statusLabel(a.status, true)}</span>
      </div>
      <Bar value={a.raised / a.raise} />
      <div className="num flex justify-between text-sm text-muted-foreground">
        <span>{usd(a.raised)} / {usd(a.raise)}</span>
        <span>{usd(a.raise - a.raised)} left</span>
      </div>
      {mine > 0 && <div className="text-sm">You: {fmt(mine)} HASH · {(share * 100).toFixed(1)}% of this miner ({fmt(share * a.th, 1)} TH)</div>}
      {a.status === "Bonding" ? (
        <div className="flex flex-wrap gap-2">
          <Input className="w-28" type="number" value={amt} onChange={(e) => setAmt(e.target.value)} />
          <Button disabled={!n || n > s.usd} onClick={() => bondAsic(a.id, n)}>
            Bond USDC · ≈{fmt(hashOut(c, a.raised, Math.min(n, a.raise - a.raised)))} HASH
          </Button>
          {mine > 0 && <Button variant="outline" onClick={() => unbondAsic(a.id)}>Pull out {usd(usdBack(c, a.raised, mine) - UNBOND_FEE, 2)}</Button>}
        </div>
      ) : a.status === "Deploying" ? (
        <Button size="sm" variant="secondary" onClick={() => asicLiveNow(a.id)}>Test: plug it in</Button>
      ) : null}
    </div>
  );
}
