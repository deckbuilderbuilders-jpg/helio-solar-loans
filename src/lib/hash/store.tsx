import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { HASH_PER_TH, HOLDER_SHARE, SATS_PER_TH_DAY, UNBOND_FEE, curveFor, hashOut, usdBack } from "./curve";

export type Status = "Bonding" | "Building" | "Live";

export interface Project {
  id: string;
  name: string;
  place: string;
  solarKw: number;
  batteryKwh: number;
  th: number; // hashrate this project adds
  raise: number; // USD to graduate
  raised: number;
  recCash: number; // expected REC + rebate cash, reinvested into hardware
  status: Status;
  holders: Record<string, number>; // wallet -> HASH
}

export interface State {
  genesisTh: number;
  reinvestedTh: number;
  projects: Project[];
  usd: number; // your wallet USDC
  sats: number; // your claimable sats
}

export const ME = "you";
const KEY = "hash:v1";

const seed = (): State => ({
  genesisTh: 100,
  reinvestedTh: 0,
  usd: 0,
  sats: 0,
  projects: [
    {
      id: "white-hall",
      name: "King St",
      place: "White Hall, IL",
      solarKw: 26.91,
      batteryKwh: 96,
      th: 400,
      raise: 54947,
      raised: 0,
      recCash: 44678,
      status: "Bonding",
      holders: {},
    },
  ],
});

export const liveTh = (s: State) =>
  s.genesisTh + s.reinvestedTh + s.projects.filter((p) => p.status === "Live").reduce((a, p) => a + p.th, 0);
export const totalHash = (s: State) =>
  s.genesisTh * HASH_PER_TH + s.projects.filter((p) => p.status !== "Bonding").reduce((a, p) => a + p.th * HASH_PER_TH, 0);
export const myHash = (s: State, liveOnly = true) =>
  s.projects.filter((p) => !liveOnly || p.status !== "Bonding").reduce((a, p) => a + (p.holders[ME] ?? 0), 0);
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
      if (raw) set(JSON.parse(raw));
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
        set((x) => ({ ...x, usd: x.usd - amt }));
        patch(id, (q) => {
          const raised = q.raised + amt;
          return {
            ...q,
            raised,
            status: raised >= q.raise - 0.01 ? "Building" : q.status,
            holders: { ...q.holders, [ME]: (q.holders[ME] ?? 0) + got },
          };
        });
        toast.success(`Minted ${got.toLocaleString(undefined, { maximumFractionDigits: 0 })} HASH`);
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
        // REC + rebate cash buys more miners: ~$15 per TH all-in.
        const extra = Math.round(p.recCash / 15 / 10) * 10;
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
