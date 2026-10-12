import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fmt, usd } from "@/components/hash/Shell";
import { Button } from "@/components/ui/button";
import { ASICS, DEPLOY_FEE, jth } from "@/lib/hash/asics";
import { freeTh, useHash } from "@/lib/hash/store";

type Sort = "efficiency" | "price" | "power" | "stock";

export const Route = createFileRoute("/marketplace")({
  validateSearch: (q: Record<string, unknown>): { project?: string; sort: Sort } => ({
    project: typeof q.project === "string" ? q.project : undefined,
    sort: (["efficiency", "price", "power", "stock"].includes(q.sort as string) ? q.sort : "efficiency") as Sort,
  }),
  head: () => ({
    meta: [
      { title: "ASIC Marketplace — HELIO" },
      { name: "description", content: "Pick a Bitcoin miner, then buy it outright or open a group curve on a solar project." },
      { property: "og:title", content: "ASIC Marketplace — HELIO" },
      { property: "og:description", content: "Pick a Bitcoin miner, then buy it outright or open a group curve on a solar project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Market,
});

function Market() {
  const { project, sort } = Route.useSearch();
  const navigate = useNavigate({ from: "/marketplace" });
  const { s, buyAsic, startAsic } = useHash();
  const ready = s.projects.filter((p) => p.status !== "Bonding");
  const target = ready.find((p) => p.id === project) ?? ready[0];
  const open = target ? freeTh(s, target) : 0;

  const list = [...ASICS].sort((a, b) =>
    sort === "price" ? a.price - b.price : sort === "power" ? a.watts - b.watts : sort === "stock" ? b.stock - a.stock : jth(a) - jth(b));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">ASIC Marketplace</h1>
        <p className="mt-2 text-muted-foreground">Pick a miner. Buy it yourself, or open a group curve so others can bond in with you.</p>
      </div>

      <div className="flex flex-wrap items-end gap-4 border border-border bg-card p-4">
        <label className="text-sm">
          <div className="eyebrow mb-1">Deploy to</div>
          <select className="h-9 rounded-sm border border-border bg-background px-2" value={target?.id ?? ""} disabled={!ready.length}
            onChange={(e) => navigate({ search: (p) => ({ ...p, project: e.target.value }) })}>
            {!ready.length && <option value="">No initialized projects yet</option>}
            {ready.map((p) => <option key={p.id} value={p.id}>{p.name} · {fmt(freeTh(s, p), 1)} TH open</option>)}
          </select>
        </label>
        <label className="text-sm">
          <div className="eyebrow mb-1">Sort by</div>
          <select className="h-9 rounded-sm border border-border bg-background px-2" value={sort}
            onChange={(e) => navigate({ search: (p) => ({ ...p, sort: e.target.value as Sort }) })}>
            <option value="efficiency">Efficiency (J/TH)</option>
            <option value="price">Price</option>
            <option value="power">Power draw</option>
            <option value="stock">Availability</option>
          </select>
        </label>
        {!ready.length && <p className="text-sm text-muted-foreground">A project must fill its curve before miners can be added.</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((a) => {
          const fits = !!target && open >= a.th;
          return (
            <div key={a.id} className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-card">
              <div className="font-display text-lg font-semibold">{a.model}</div>
              <div className="num mt-1 text-2xl">{a.th} TH/s</div>
              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Power</dt><dd className="num text-right">{fmt(a.watts)} W</dd>
                <dt className="text-muted-foreground">Efficiency</dt><dd className="num text-right">{jth(a).toFixed(1)} J/TH</dd>
                <dt className="text-muted-foreground">Price</dt><dd className="num text-right">{usd(a.price)}</dd>
                <dt className="text-muted-foreground">In stock</dt><dd className="num text-right">{a.stock}</dd>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">{a.note}</p>
              <div className="mt-auto space-y-2 pt-5">
                <Button className="w-full" disabled={!fits || s.usd < a.price + DEPLOY_FEE} onClick={() => target && buyAsic(target.id, a.id)}>
                  Buy & Deploy · {usd(a.price + DEPLOY_FEE)}
                </Button>
                <Button className="w-full" variant="outline" disabled={!fits} onClick={() => {
                  if (target && startAsic(target.id, a.id)) navigate({ to: "/project/$id", params: { id: target.id } });
                }}>
                  Mint into Project
                </Button>
                {target && !fits && <p className="text-xs text-muted-foreground">Needs {a.th} TH open · {fmt(open, 1)} TH free</p>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Prices are estimates for testing. Includes a ${DEPLOY_FEE} deployment fee per miner.</p>
    </div>
  );
}
