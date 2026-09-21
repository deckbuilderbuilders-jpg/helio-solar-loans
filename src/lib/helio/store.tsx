/**
 * HelioProvider — holds the simulated devnet ledger, the connected demo wallet and a live clock.
 * State persists to localStorage so a judge can reload mid-demo; "Reset demo" re-runs the seed.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import * as L from "./ledger";
import { DEMO, seedState } from "./seed";
import type { Address, Gate, HelioProject, LedgerState, PayoutKind } from "./types";
import type { ProjectSpecs } from "./takeout";

const STORAGE_KEY = "helio:devnet-sim:v2";
const WALLET_KEY = "helio:wallet:v2";

export type Role = "investor" | "admin";

export interface HelioContextValue {
  ready: boolean;
  state: LedgerState;
  now: number;
  wallet: Address | null;
  role: Role | null;
  balance: number;
  panels: number;
  connect: (role: Role) => void;
  disconnect: () => void;
  resetDemo: () => void;
  faucet: (amount?: number) => void;
  buyPanels: (count: number) => void;
  bondPanels: (projectId: string, panels: number) => void;
  originate: (a: Omit<L.OriginateArgs, "now">) => HelioProject | null;
  setGate: (projectId: string, gate: Gate) => void;
  recordPayment: (projectId: string, kind: PayoutKind, amount: number, memo: string) => void;
  claim: (projectId: string) => void;
}

const Ctx = createContext<HelioContextValue | null>(null);

const roleWallet: Record<Role, Address> = { investor: DEMO.investor, admin: DEMO.admin };
const walletRole = (w: Address | null): Role | null => (w === DEMO.admin ? "admin" : w ? "investor" : null);

const nowSec = () => Math.floor(Date.now() / 1000);

export function HelioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LedgerState | null>(null);
  const [wallet, setWallet] = useState<Address | null>(null);
  const [now, setNow] = useState<number>(nowSec());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setState(raw ? (JSON.parse(raw) as LedgerState) : seedState(nowSec()));
      setWallet(window.localStorage.getItem(WALLET_KEY));
    } catch {
      setState(seedState(nowSec()));
    }
    const t = window.setInterval(() => setNow(nowSec()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (state) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);
  useEffect(() => {
    if (wallet) window.localStorage.setItem(WALLET_KEY, wallet);
    else window.localStorage.removeItem(WALLET_KEY);
  }, [wallet]);

  const run = useCallback(
    <T,>(label: string, fn: (s: LedgerState, now: number) => { state: LedgerState; result: T }): T | null => {
      if (!state) return null;
      try {
        const { state: next, result } = fn(state, nowSec());
        setState(next);
        toast.success(label, { description: next.log[0]?.detail });
        return result;
      } catch (e) {
        toast.error(`${label} failed`, { description: e instanceof Error ? e.message : String(e) });
        return null;
      }
    },
    [state],
  );

  const requireWallet = useCallback((): Address => {
    if (!wallet) {
      throw new L.HelioError("NoWallet", "Connect a wallet first — use “Load demo wallet” in the header.");
    }
    return wallet;
  }, [wallet]);

  const value = useMemo<HelioContextValue>(() => {
    const s = state ?? seedState(0);
    return {
      ready: state !== null,
      state: s,
      now,
      wallet,
      role: walletRole(wallet),
      balance: wallet ? L.balanceOf(s, wallet) : 0,
      panels: wallet ? L.panelsOf(s, wallet) : 0,
      connect: (role) => {
        setWallet(roleWallet[role]);
        toast.success(role === "admin" ? "Connected originator admin" : "Connected demo wallet", { description: L.short(roleWallet[role]) });
      },
      disconnect: () => setWallet(null),
      resetDemo: () => {
        setState(seedState(nowSec()));
        toast.success("Demo reseeded", { description: "500-panel mint · 4 originated jobs · 1 paid out" });
      },
      faucet: (amount = 10_000) =>
        run("Faucet", (st, t) => ({ state: L.faucet(st, requireWallet(), amount, t), result: null })),
      buyPanels: (count) =>
        run("Panels minted", (st, t) => {
          const r = L.buyPanels(st, { buyer: requireWallet(), count, now: t });
          return { state: r.state, result: null };
        }),
      bondPanels: (projectId, panels) =>
        run("Panels burned into project", (st, t) => {
          const r = L.bondPanels(st, { holder: requireWallet(), projectId, panels, now: t });
          return { state: r.state, result: null };
        }),
      originate: (a) =>
        run("Project originated", (st, t) => {
          const r = L.originateProject(st, requireWallet(), { ...a, now: t });
          return { state: r.state, result: r.project };
        }),
      setGate: (projectId, gate) =>
        run(`Gate set to G${gate}`, (st, t) => ({ state: L.adminSetGate(st, requireWallet(), projectId, gate, t), result: null })),
      recordPayment: (projectId, kind, amount, memo) =>
        run(kind === "rebate" ? "Ameren rebate credited" : kind === "rec" ? "First REC payment credited" : "REC tail quarter credited", (st, t) => ({
          state: L.recordTakeoutPayment(st, { signer: requireWallet(), projectId, kind, amount, memo, now: t }),
          result: null,
        })),
      claim: (projectId) =>
        run("Claimed", (st, t) => {
          const r = L.claim(st, { holder: requireWallet(), projectId, now: t });
          return { state: r.state, result: null };
        }),
    };
  }, [state, now, wallet, run, requireWallet]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHelio(): HelioContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useHelio must be used inside <HelioProvider>");
  return v;
}
