import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { HASH_PER_TH, HOLDER_SHARE, SATS_PER_TH_DAY, UNBOND_FEE, curveFor, hashOut, usdBack } from "./curve";
import { DEPLOY_FEE, asicById, capacityTh } from "./asics";

export type Status = "Bonding" | "Building" | "Live";
export type AsicStatus = "Bonding" | "Deploying" | "Live";

/** User-facing badge text for each status. */
export const statusLabel = (st: Status | AsicStatus, asic = false) =>
  asic
    ? ({ Bonding: "ASIC Bonding", Deploying: "Deploying", Live: "Live" } as Record<string, string>)[st]
    : ({ Bonding: "Curve Open", Building: "Initialized", Live: "Live" } as Record<string, string>)[st];

export interface Project {
  id: string;
  name: string;
  place: string;
  solarKw: number;
  batteryKwh: number;
  th: number; // base hashrate bought with the project raise
  raise: number;
  raised: number;
  recCash: number;
  status: Status;
  holders: Record<string, number>;
}

export interface AsicCurve {
  id: string;
  projectId: string;
  modelId: string;
  th: number;
  raise: number;
  raised: number;
  status: AsicStatus;
  holders: Record<string, number>;
}

export interface State {
  genesisTh: number;
  reinvestedTh: number;
  projects: Project[];
  asics: AsicCurve[];
  usd: number;
  sats: number;
}

export const ME = "you";
const KEY = "hash:v1";

const seed = (): State => ({
  genesisTh: 100,
  reinvestedTh: 0,
  usd: 0,
  sats: 0,
  asics: [],
  projects: [
    {
      id: "white-hall", name: "King St", place: "White Hall, IL", solarKw: 26.91, batteryKwh: 96,
      th: 400, raise: 54947, raised: 0, recCash: 44678, status: "Bonding", holders: {},
    },
  ],
});

const asicLive = (a: AsicCurve) => a.status === "Live";
const asicFunded = (a: AsicCurve) => a.status !== "Bonding";

export const usedTh = (s: State, projectId: string) =>
  (s.projects.find((p) => p.id === projectId)?.th ?? 0) +
  s.asics.filter((a) => a.projectId === projectId).reduce((t, a) => t + a.th, 0);
export const freeTh = (s: State, p: Project) => Math.max(0, capacityTh(p.solarKw) - usedTh(s, p.id));

export const liveTh = (s: State) =>
  s.genesisTh + s.reinvestedTh +
  s.projects.filter((p) => p.status === "Live").reduce((a, p) => a + p.th, 0) +
  s.asics.filter(asicLive).reduce((a, x) => a + x.th, 0);
export const totalHash = (s: State) =>
  s.genesisTh * HASH_PER_TH +
  s.projects.filter((p) => p.status !== "Bonding").reduce((a, p) => a + p.th * HASH_PER_TH, 0) +
  s.asics.filter(asicFunded).reduce((a, x) => a + x.th * HASH_PER_TH, 0);
export const myHash = (s: State, liveOnly = true) =>
  s.projects.filter((p) => !liveOnly || p.status !== "Bonding").reduce((a, p) => a + (p.holders[ME] ?? 0), 0) +
  s.asics.filter((x) => !liveOnly || asicFunded(x)).reduce((a, x) => a + (x.holders[ME] ?? 0), 0);
export const satsPerDay = (s: State) => {
  const share = myHash(s) / totalHash(s);
  return share * liveTh(s) * SATS_PER_TH_DAY * HOLDER_SHARE;
};

interface Ctx {
  s: State;
  faucet: () => void;
  bond: (id: string, usd: number) => void;
  unbond: (id: string) => void;
  advance: (id: string) => void;
  startAsic: (projectId: string, modelId: string) => string | null;
  buyAsic: (projectId: string, modelId: string) => void;
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
      if (raw) set({ ...seed(), ...JSON.parse(raw), asics: JSON.parse(raw).asics ?? [] });
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(s));
  }, [s, loaded]);

  const value = useMemo<Ctx>(() => {
    const patch = (id: string, f: (p: Project) => Project) =>
      set((x) => ({ ...x, projects: x.projects.map((p) => (p.id === id ? f(p) : p)) }));
    const patchA = (id: string, f: (a: AsicCurve) => AsicCurve) =>
      set((x) => ({ ...x, asics: x.asics.map((a) => (a.id === id ? f(a) : a)) }));
    const canFit = (projectId: string, modelId: string) => {
      const p = s.projects.find((q) => q.id === projectId);
      if (!p || p.status === "Bonding") { toast.error("Project must be initialized first"); return null; }
      const m = asicById(modelId);
      if (freeTh(s, p) < m.th) { toast.error("Not enough open power on this project"); return null; }
      return m;
    };
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
          ...q, raised: q.raised + amt, status: fills ? "Building" : q.status,
          holders: { ...q.holders, [ME]: (q.holders[ME] ?? 0) + got },
        }));
        toast.success(`Minted ${got.toLocaleString(undefined, { maximumFractionDigits: 0 })} HASH`);
        if (fills) toast.success(`${p.name} initialized. USDC locked. Awaiting ASIC deployment.`);
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
      advance: (id) => {
        const p = s.projects.find((q) => q.id === id)!;
        if (p.status !== "Building") return;
        patch(id, (q) => ({ ...q, status: "Live" }));
        const extra = Math.round(p.recCash / 15 / 10) * 10;
        set((x) => ({ ...x, reinvestedTh: x.reinvestedTh + extra }));
        toast.success(`${p.name} is live. REC cash bought +${extra} TH.`);
      },
      startAsic: (projectId, modelId) => {
        const m = canFit(projectId, modelId);
        if (!m) return null;
        const id = `${modelId}-${Date.now().toString(36)}`;
        set((x) => ({ ...x, asics: [...x.asics, { id, projectId, modelId, th: m.th, raise: m.price + DEPLOY_FEE, raised: 0, status: "Bonding", holders: {} }] }));
        toast.success(`${m.model} curve opened`);
        return id;
      },
      buyAsic: (projectId, modelId) => {
        const m = canFit(projectId, modelId);
        if (!m) return;
        const cost = m.price + DEPLOY_FEE;
        if (s.usd < cost) { toast.error("Not enough USDC"); return; }
        const id = `${modelId}-${Date.now().toString(36)}`;
        set((x) => ({
          ...x, usd: x.usd - cost,
          asics: [...x.asics, { id, projectId, modelId, th: m.th, raise: cost, raised: cost, status: "Deploying", holders: { [ME]: m.th * HASH_PER_TH } }],
        }));
        toast.success(`Bought ${m.model}. Minted ${(m.th * HASH_PER_TH).toLocaleString()} HASH`);
      },
      bondAsic: (id, usd) => {
        const a = s.asics.find((q) => q.id === id)!;
        const amt = Math.min(usd, a.raise - a.raised, s.usd);
        if (amt <= 0 || a.status !== "Bonding") return;
        const got = hashOut(curveFor(a.raise, a.th), a.raised, amt);
        const fills = a.raised + amt >= a.raise - 0.01;
        set((x) => ({ ...x, usd: x.usd - amt }));
        patchA(id, (q) => ({
          ...q, raised: q.raised + amt, status: fills ? "Deploying" : q.status,
          holders: { ...q.holders, [ME]: (q.holders[ME] ?? 0) + got },
        }));
        toast.success(`Minted ${got.toLocaleString(undefined, { maximumFractionDigits: 0 })} HASH`);
        if (fills) toast.success(`${asicById(a.modelId).model} funded. Deploying.`);
      },
      unbondAsic: (id) => {
        const a = s.asics.find((q) => q.id === id)!;
        const h = a.holders[ME] ?? 0;
        if (!h || a.status !== "Bonding") return;
        const back = usdBack(curveFor(a.raise, a.th), a.raised, h);
        set((x) => ({ ...x, usd: x.usd + Math.max(0, back - UNBOND_FEE) }));
        patchA(id, (q) => ({ ...q, raised: q.raised - back, holders: { ...q.holders, [ME]: 0 } }));
        toast(`Pulled $${(back - UNBOND_FEE).toFixed(2)} (−$${UNBOND_FEE} fee)`);
      },
      asicLiveNow: (id) => {
        patchA(id, (q) => (q.status === "Deploying" ? { ...q, status: "Live" } : q));
        toast.success("Miner is live");
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
