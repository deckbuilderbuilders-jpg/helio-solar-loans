/**
 * WATTS — HELIO's seasonal points program. Pure view over ledger state.
 *
 * Fixed emission per season, split into pools. Each wallet earns a
 * proportional slice of each pool. Completion (repaid notes) is the main pool.
 *
 *   55% Completion   notes whose waterfall repaid lenders
 *   20% Capital      USDC × days × fill mult × hold mult
 *   15% Origination  creators: kW × roof-state mult (cap 12% of pool)
 *    7% Installer    W-DC × (1 + 0.25 day-one) × on-time
 *    3% Referral     reserved (no referral data yet)
 *
 * Wallet cap: 8% of season total (installer co. allowlisted). No USD value.
 */
import { econOf, lockupDays, settleAt } from "./ledger";
import type { Address, HelioNote, LedgerState } from "./types";

const D = 86400;

export const SEASON = { id: 0, name: "Season 0", days: 90, emission: 100_000_000 };
export const POOLS = { completion: 0.55, capital: 0.2, origination: 0.15, installer: 0.07, referral: 0.03 } as const;
export type PoolKey = keyof typeof POOLS;
export const POOL_LABEL: Record<PoolKey, string> = {
  completion: "Completion",
  capital: "Capital",
  origination: "Origination",
  installer: "Installer",
  referral: "Referral",
};

export const HOLD = { exitedBeforeFill: 0.25, exitedAfterFill: 0.6, heldToRepay: 1, rolled: 1.15 } as const;
export const ROLL_WINDOW_DAYS = 14;
export const WALLET_CAP = 0.08;
export const CREATOR_CAP = 0.12;
export const WASH_HAIRCUT = 0.5;

export const speedMult = (days: number) => (days <= 105 ? 1.1 : days <= 120 ? 1 : 0.7);
export const qualityMult = (n: HelioNote) => (n.application?.fileHash ? 1 : 0.5);

/** Creator vest by roof state. */
export function creatorStateMult(n: HelioNote): number {
  if (n.failed) return 0;
  if (n.stage >= 5) return 1.25;
  if (n.stage === 4) return 1;
  if (n.stage >= 2) return 0.4;
  return 0.1;
}
export const CREATOR_STATES = [
  { label: "Fee paid, filling", m: 0.1 },
  { label: "Filled / building", m: 0.4 },
  { label: "Energized (PTO)", m: 1 },
  { label: "Repaid", m: 1.25 },
];

const mfillOf = (n: HelioNote, who: Address) => {
  const p = n.deposits[who] ?? 0;
  return p > 0 ? (n.points[who] ?? p) / p : 1;
};
const avgDepositAt = (n: HelioNote, who: Address) => {
  const p = n.deposits[who] ?? 0;
  return p > 0 ? (n.timeDollars[who] ?? 0) / p : 0;
};

function rolled(s: LedgerState, n: HelioNote, who: Address): boolean {
  if (!n.repaidAt) return false;
  return s.notes.some((m) => {
    if (m.id === n.id || m.failed || !((m.deposits[who] ?? 0) > 0)) return false;
    const t = avgDepositAt(m, who);
    return t >= n.repaidAt! && t <= n.repaidAt! + ROLL_WINDOW_DAYS * D;
  });
}

export interface WalletWatts {
  wallet: Address;
  pools: Record<PoolKey, number>;
  total: number;
  vested: number;
  pending: number;
  capped: boolean;
}

export interface SeasonWatts {
  wallets: WalletWatts[];
  poolSize: Record<PoolKey, number>;
  distributed: Record<PoolKey, number>;
  /** Est. completion WATTS per note if it repays now at current weights. */
  noteCompletionEst: Record<string, number>;
}

const zero = (): Record<PoolKey, number> => ({ completion: 0, capital: 0, origination: 0, installer: 0, referral: 0 });

export function seasonWatts(s: LedgerState, now: number): SeasonWatts {
  const S = SEASON.emission;
  const poolSize = Object.fromEntries(Object.entries(POOLS).map(([k, v]) => [k, v * S])) as Record<PoolKey, number>;
  const notes = s.notes;

  // raw weights per pool per wallet; vested flag per (pool,wallet) weight share
  const w: Record<PoolKey, Record<Address, { v: number; pending: number }>> = {
    completion: {}, capital: {}, origination: {}, installer: {}, referral: {},
  };
  const add = (pool: PoolKey, who: Address, amt: number, pending = false) => {
    const e = (w[pool][who] ??= { v: 0, pending: 0 });
    e.v += amt;
    if (pending) e.pending += amt;
  };

  // Capital
  for (const n of notes) {
    for (const who of Object.keys(n.deposits)) {
      const p = n.deposits[who] ?? 0;
      if (!(p > 0)) continue;
      const end = n.repaidAt ?? (n.fundedAt ? Math.min(now, settleAt(n, now)) : now);
      const days = Math.max(0, (end - avgDepositAt(n, who)) / D);
      const hold = n.failed ? HOLD.exitedAfterFill : n.stage >= 5 ? (rolled(s, n, who) ? HOLD.rolled : HOLD.heldToRepay) : HOLD.heldToRepay;
      add("capital", who, p * days * mfillOf(n, who) * hold, n.stage < 5);
    }
    for (const x of n.exits ?? []) add("capital", x.who, x.amount * x.days * x.mfill * HOLD.exitedBeforeFill);
  }

  // Completion: note weight = size × coverage × speed × quality
  const noteW = (n: HelioNote) => {
    const e = econOf(n);
    return e.buildCost * e.coverage * speedMult(lockupDays(n, n.repaidAt ?? 0)) * qualityMult(n);
  };
  const repaid = notes.filter((n) => !n.failed && n.stage >= 5);
  const sumW = repaid.reduce((a, n) => a + noteW(n), 0);
  const noteCompletionEst: Record<string, number> = {};
  for (const n of notes) {
    if (n.failed) continue;
    const Wn = noteW(n);
    const isRepaid = n.stage >= 5;
    const denom = isRepaid ? sumW : sumW + Wn;
    noteCompletionEst[n.id] = denom > 0 ? (Wn / denom) * poolSize.completion : 0;
    if (!isRepaid) continue;
    const share = Wn / sumW;
    const lenders = Object.keys(n.deposits).filter((k) => (n.deposits[k] ?? 0) > 0);
    const sumL = lenders.reduce((a, k) => a + (n.deposits[k] ?? 0) * mfillOf(n, k), 0);
    for (const k of lenders) {
      let amt = ((n.deposits[k] ?? 0) * mfillOf(n, k)) / sumL;
      if (k === n.creator) amt *= WASH_HAIRCUT;
      add("completion", k, amt * share);
    }
  }

  // Origination
  for (const n of notes) {
    const m = creatorStateMult(n);
    if (m > 0) add("origination", n.creator, n.kwDc * m, n.stage < 5);
  }

  // Installer
  for (const n of notes) {
    if (n.failed || n.stage < 3) continue;
    add("installer", s.config.installer, n.kwDc * 1000 * (1 + (n.dayOne ? 0.25 : 0)) * 1, n.stage < 5);
  }

  // Convert weights → WATTS
  const out: Record<Address, WalletWatts> = {};
  const distributed = zero();
  (Object.keys(POOLS) as PoolKey[]).forEach((pool) => {
    const entries = Object.entries(w[pool]);
    // completion weights are already shares of the pool; others normalise
    const sum = pool === "completion" ? 1 : entries.reduce((a, [, e]) => a + e.v, 0);
    for (const [who, e] of entries) {
      if (sum <= 0) continue;
      let amt = (e.v / sum) * poolSize[pool];
      if ((pool === "origination") && amt > CREATOR_CAP * poolSize[pool]) amt = CREATOR_CAP * poolSize[pool];
      const r = (out[who] ??= { wallet: who, pools: zero(), total: 0, vested: 0, pending: 0, capped: false });
      r.pools[pool] += amt;
      const pend = e.v > 0 ? (amt * e.pending) / e.v : 0;
      r.pending += pend;
      r.vested += amt - pend;
    }
  });
  for (const r of Object.values(out)) {
    r.total = Object.values(r.pools).reduce((a, b) => a + b, 0);
    const cap = WALLET_CAP * S;
    if (r.wallet !== s.config.installer && r.total > cap) {
      const k = cap / r.total;
      (Object.keys(r.pools) as PoolKey[]).forEach((p) => (r.pools[p] *= k));
      r.vested *= k;
      r.pending *= k;
      r.total = cap;
      r.capped = true;
    }
    (Object.keys(r.pools) as PoolKey[]).forEach((p) => (distributed[p] += r.pools[p]));
  }
  return {
    wallets: Object.values(out).sort((a, b) => b.total - a.total),
    poolSize,
    distributed,
    noteCompletionEst,
  };
}

export const fmtWatts = (n: number) => Math.round(n).toLocaleString("en-US");
