import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { HASH_PER_TH, HOLDER_SHARE, SATS_PER_TH_DAY, UNBOND_FEE, curveFor, hashOut, usdBack } from "./curve";
import { DEPLOY_FEE, TH_COST, capacityTh } from "./asics";

export type Status = "Bonding" | "Finalized" | "Live";
export type AsicStatus = "Closed" | "Bonding" | "Funded" | "Live";

/** One badge per stage: Bond Project → Project Finalized → Bond ASICs → Miners Funded → Live. */
export const projectBadge = (p: Project) => (p.status === "Bonding" ? "Bond Project" : "Project Finalized");
export const asicBadge = (p: Project) =>
  ({ Closed: "Not open", Bonding: "Bond ASICs", Funded: "Miners Funded", Live: "Live" } as const)[p.asic.status];
export const stageBadge = (p: Project) =>
  p.status === "Bonding" ? "Bond Project" : p.asic.status === "Bonding" ? "Bond ASICs" : p.asic.status === "Funded" ? "Miners Funded" : "Live";

export interface AsicCurve {
  th: number; // planned hashrate = solar capacity
  raise: number; // miner cost + deploy fee
  raised: number;
  status: AsicStatus;
  holders: Record<string, number>;
}

export interface Project {
  id: string;
  name: string;
  place: string;
  solarKw: number;
  batteryKwh: number;
  th: number; // HASH on the startup curve, in TH units (× HASH_PER_TH)
  raise: number; // site startup: land, application, initial costs
  raised: number;
  recCash: number;
  status: Status;
  holders: Record<string, number>;
  asic: AsicCurve;
}

export interface State {
  genesisTh: number;
  reinvestedTh: number;
  projects: Project[];
  usd: number;
  sats: number;
}

export const ME = "you";
const KEY = "hash:v2";

const asicFor = (solarKw: number): AsicCurve => {
  const th = capacityTh(solarKw);
  return { th, raise: Math.round((th * TH_COST + DEPLOY_FEE) / 100) * 100, raised: 0, status: "Closed", holders: {} };
};

const seed = (): State => ({
  genesisTh: 100,
  reinvestedTh: 0,
  usd: 0,
  sats: 0,
  projects: [
    {
      id: "white-hall", name: "King St", place: "White Hall, IL", solarKw: 26.91, batteryKwh: 96,
      th: 250, raise: 4000, raised: 0, recCash: 44678, status: "Bonding", holders: {}, asic: asicFor(26.91),
    },
  ],
});

const funded = (a: AsicCurve) => a.status === "Funded" || a.status === "Live";

export const liveTh = (s: State) =>
  s.genesisTh + s.reinvestedTh + s.projects.filter((p) => p.asic.status === "Live").reduce((a, p) => a + p.asic.th, 0);
export const totalHash = (s: State) =>
  s.genesisTh * HASH_PER_TH +
  s.projects.reduce((a, p) => a + (p.status !== "Bonding" ? p.th : 0) * HASH_PER_TH + (funded(p.asic) ? p.asic.th : 0) * HASH_PER_TH, 0);
export const myHash = (s: State, liveOnly = true) =>
  s.projects.reduce(
    (a, p) =>
      a + (!liveOnly || p.status !== "Bonding" ? p.holders[ME] ?? 0 : 0) + (!liveOnly || funded(p.asic) ? p.asic.holders[ME] ?? 0 : 0),
    0,
  );
export const satsPerDay = (s: State) => {
  const share = myHash(s) / totalHash(s);
  return share * liveTh(s) * SATS_PER_TH_DAY * HOLDER_SHARE;
};

interface Ctx {
  s: State;
  faucet: () => void;
  bond: (id: string, usd: number) => void;
  unbond: (id: string) => void;
  bondAsic: (id: string, usd: number) => void;
  unbondAsic: (id: string) => void;
  asicLiveNow: (id: string) => void;
  mine: (days: number) => void;
  claim: () => void;
  reset: () => void;
}

const g = globalThis as { __hashCtx?: React.Context<Ctx | null> };
const C = (g.__hashCtx ??= createContext<Ctx | null>(null));

export function HashProvider({ children }: { children: ReactNode }) {
  const [s, set] = useState<State>(seed);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) set({ ...seed(), ...JSON.parse(raw) });
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(s));
  }, [s, loaded]);

  const value = useMemo<Ctx>(() => {
    const patch = (id: string, f: (p: Project) => Project) =>
      set((x) => ({ ...x, projects: x.projects.map((p) => (p.id === id ? f(p) : p)) }));
    return {
      s,
      faucet: () => set((x) => ({ ...x, usd: x.usd + 1000 })),
      bond: (id, usd) => {
        const p = s.projects.find((q) => q.id === id)!;
        const amt = Math.min(usd, p.raise - p.raised, s.usd);
        if (amt <= 0 || p.status !== "Bonding") return;
        const got = hashOut(curveFor(p.raise, p.th), p.raised, amt);
        const fills = p.raised + amt >= p.raise - 0.01;
        set((x) => ({ ...x, usd: x.usd - amt }));
        patch(id, (q) => ({
          ...q, raised: q.raised + amt, status: fills ? "Finalized" : q.status,
          asic: fills ? { ...q.asic, status: "Bonding" } : q.asic,
          holders: { ...q.holders, [ME]: (q.holders[ME] ?? 0) + got },
        }));
        toast.success(`Minted ${got.toLocaleString(undefined, { maximumFractionDigits: 0 })} HASH`);
        if (fills) toast.success(`${p.name} finalized. ASIC curve is open — fund the miners.`);
      },
      unbond: (id) => {
        const p = s.projects.find((q) => q.id === id)!;
        const h = p.holders[ME] ?? 0;
        if (!h || p.status !== "Bonding") return;
        const back = usdBack(curveFor(p.raise, p.th), p.raised, h);
        set((x) => ({ ...x, usd: x.usd + Math.max(0, back - UNBOND_FEE) }));
        patch(id, (q) => ({ ...q, raised: q.raised - back, holders: { ...q.holders, [ME]: 0 } }));
        toast(`Pulled $${(back - UNBOND_FEE).toFixed(2)} (−$${UNBOND_FEE} fee)`);
      },
      bondAsic: (id, usd) => {
        const p = s.projects.find((q) => q.id === id)!;
        const a = p.asic;
        if (a.status !== "Bonding") { toast.error("ASIC curve opens when the project curve hits 100%"); return; }
        const amt = Math.min(usd, a.raise - a.raised, s.usd);
        if (amt <= 0) return;
        const got = hashOut(curveFor(a.raise, a.th), a.raised, amt);
        const fills = a.raised + amt >= a.raise - 0.01;
        set((x) => ({ ...x, usd: x.usd - amt }));
        patch(id, (q) => ({
          ...q,
          asic: { ...q.asic, raised: q.asic.raised + amt, status: fills ? "Funded" : "Bonding", holders: { ...q.asic.holders, [ME]: (q.asic.holders[ME] ?? 0) + got } },
        }));
        toast.success(`Minted ${got.toLocaleString(undefined, { maximumFractionDigits: 0 })} HASH`);
        if (fills) toast.success(`Miners funded for ${p.name}. Deploying.`);
      },
      unbondAsic: (id) => {
        const p = s.projects.find((q) => q.id === id)!;
        const a = p.asic;
        const h = a.holders[ME] ?? 0;
        if (!h || a.status !== "Bonding") return;
        const back = usdBack(curveFor(a.raise, a.th), a.raised, h);
        set((x) => ({ ...x, usd: x.usd + Math.max(0, back - UNBOND_FEE) }));
        patch(id, (q) => ({ ...q, asic: { ...q.asic, raised: q.asic.raised - back, holders: { ...q.asic.holders, [ME]: 0 } } }));
        toast(`Pulled $${(back - UNBOND_FEE).toFixed(2)} (−$${UNBOND_FEE} fee)`);
      },
      asicLiveNow: (id) => {
        const p = s.projects.find((q) => q.id === id)!;
        if (p.asic.status !== "Funded") return;
        const extra = Math.round(p.recCash / 15 / 10) * 10;
        patch(id, (q) => ({ ...q, status: "Live", asic: { ...q.asic, status: "Live" } }));
        set((x) => ({ ...x, reinvestedTh: x.reinvestedTh + extra }));
        toast.success(`${p.name} is live. REC cash bought +${extra} TH.`);
      },
      mine: (days) => set((x) => ({ ...x, sats: x.sats + satsPerDay(x) * days })),
      claim: () => {
        toast.success(`Claimed ${Math.floor(s.sats).toLocaleString()} sats`);
        set((x) => ({ ...x, sats: 0 }));
      },
      reset: () => set(seed()),
    };
  }, [s]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useHash() {
  const v = useContext(C);
  if (!v) throw new Error("useHash must be used inside <HashProvider>");
  return v;
}
