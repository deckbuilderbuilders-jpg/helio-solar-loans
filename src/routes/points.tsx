import { createFileRoute } from "@tanstack/react-router";
import { SectionHead, Stat } from "@/components/helio/ui";
import { short } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";
import {
  CREATOR_CAP,
  CREATOR_STATES,
  HOLD,
  POOLS,
  POOL_LABEL,
  ROLL_WINDOW_DAYS,
  SEASON,
  WALLET_CAP,
  fmtWatts,
  seasonWatts,
  type PoolKey,
} from "@/lib/helio/watts";

export const Route = createFileRoute("/points")({
  head: () => ({
    meta: [
      { title: "WATTS points — HELIO" },
      { name: "description", content: "HELIO's seasonal WATTS program: fixed emission split across completion, capital, origination, installer and referral pools." },
      { property: "og:title", content: "WATTS points — HELIO" },
      { property: "og:description", content: "Points for roofs that fill, get built and repay — not idle capital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Points,
});

const POOL_NOTE: Record<PoolKey, string> = {
  completion: "Notes that repay. Note weight = size × coverage × speed × quality; lenders split by USDC × fill multiplier.",
  capital: "Funded USDC × days × fill multiplier × hold multiplier. Idle wallet USDC earns nothing.",
  origination: `Creators who paid the $20/kW fee. kW × roof-state vest. Max ${CREATOR_CAP * 100}% of the pool per creator.`,
  installer: "W-DC installed × (1.25 if built in one day) × on-time.",
  referral: "Reserved. Referred capital must be new and stay to repayment. Self-referrals earn 0.",
};

function Points() {
  const { state, wallet, now } = useHelio();
  const sw = seasonWatts(state, now);
  const me = wallet ? sw.wallets.find((w) => w.wallet === wallet) : undefined;
  const pools = Object.keys(POOLS) as PoolKey[];

  return (
    <div className="space-y-10">
      <div>
        <div className="eyebrow">{SEASON.name} · {SEASON.days} days</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">WATTS</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          A fixed {fmtWatts(SEASON.emission)} WATTS this season. You earn a share of each pool. Most of it goes to notes that repay. WATTS have no cash value.
        </p>
      </div>

      {wallet && (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Stat label="Your WATTS" value={fmtWatts(me?.total ?? 0)} sub={me?.capped ? `capped at ${WALLET_CAP * 100}% of season` : "this season"} accent />
          <Stat label="Vested" value={fmtWatts(me?.vested ?? 0)} sub="from repaid notes" />
          <Stat label="Pending" value={fmtWatts(me?.pending ?? 0)} sub="vests at repayment" />
          <Stat label="Share of season" value={`${(((me?.total ?? 0) / SEASON.emission) * 100).toFixed(2)}%`} />
        </div>
      )}

      <section>
        <SectionHead eyebrow="Published weights" title="Season pools" />
        <div className="panel divide-y divide-border">
          {pools.map((p) => (
            <div key={p} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[140px_90px_1fr_220px] md:items-center">
              <span className="font-medium">{POOL_LABEL[p]}</span>
              <span className="num text-volt">{POOLS[p] * 100}%</span>
              <span className="text-muted-foreground">{POOL_NOTE[p]}</span>
              <span className="num text-right text-xs text-muted-foreground">
                {fmtWatts(sw.distributed[p])} / {fmtWatts(sw.poolSize[p])}
                {me ? ` · you ${fmtWatts(me.pools[p])}` : ""}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="panel p-5 text-sm">
          <div className="eyebrow mb-2">Fill multiplier</div>
          <p className="text-muted-foreground">2.0x for the first dollar, falling in a straight line to 1.0x at 100% filled. Shown live on every note card. No whale bonus.</p>
        </div>
        <div className="panel p-5 text-sm">
          <div className="eyebrow mb-2">Hold multiplier</div>
          <ul className="space-y-1 text-muted-foreground">
            <li>Exited before fill: <span className="num text-foreground">{HOLD.exitedBeforeFill}x</span></li>
            <li>Exited after fill: <span className="num text-foreground">{HOLD.exitedAfterFill}x</span></li>
            <li>Held to repayment: <span className="num text-foreground">{HOLD.heldToRepay}x</span></li>
            <li>Rolled into a new note within {ROLL_WINDOW_DAYS} days: <span className="num text-foreground">{HOLD.rolled}x</span></li>
          </ul>
        </div>
        <div className="panel p-5 text-sm">
          <div className="eyebrow mb-2">Creator vest</div>
          <ul className="space-y-1 text-muted-foreground">
            {CREATOR_STATES.map((c) => (
              <li key={c.label}>{c.label}: <span className="num text-foreground">{c.m}x</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <SectionHead eyebrow="Leaderboard" title="Top wallets" />
        <div className="panel divide-y divide-border">
          {sw.wallets.filter((w) => w.total >= 1000).map((w, i) => (
            <div key={w.wallet} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-mono">
                {i + 1}. {short(w.wallet)} {w.wallet === wallet && <span className="text-volt">(you)</span>}
              </span>
              <span className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {pools.filter((p) => w.pools[p] > 0).map((p) => (
                  <span key={p}>{POOL_LABEL[p]} {fmtWatts(w.pools[p])}</span>
                ))}
                <span className="num text-foreground">{fmtWatts(w.total)}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5 text-sm text-muted-foreground">
        <div className="eyebrow mb-2 text-foreground">Anti-farm rules</div>
        <ul className="list-disc space-y-1 pl-5">
          <li>Wallet cap {WALLET_CAP * 100}% of the season (installer companies allowlisted).</li>
          <li>Creator lending into their own note: completion WATTS cut 50%.</li>
          <li>One Illinois Shines application → one roof. Notes entered without an imported application get 0.5x completion quality.</li>
          <li>Failed or cancelled notes earn no completion WATTS. Capital WATTS already earned stay.</li>
          <li>21-day clawback after repayment if the REC sale or a rebate is reversed.</li>
        </ul>
      </section>
    </div>
  );
}
