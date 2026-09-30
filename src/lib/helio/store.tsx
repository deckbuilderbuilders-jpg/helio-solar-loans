import type React from "react";
/**
 * HelioProvider — simulated devnet ledger, connected demo wallet, live clock.
 * Persists to localStorage; "Reset demo" re-runs the seed.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import * as L from "./ledger";
import { DEMO, seedState } from "./seed";
import type { Address, HelioNote, LedgerState } from "./types";

const STORAGE_KEY = "helio:devnet-sim:v7-whitehall";
const WALLET_KEY = "helio:wallet:v3";

export type Role = "investor" | "admin" | "installer";

export interface HelioContextValue {
  ready: boolean;
  state: LedgerState;
  now: number;
  wallet: Address | null;
  role: Role | null;
  balance: number;
  connect: (role: Role) => void;
  disconnect: () => void;
  resetDemo: () => void;
  faucet: (amount?: number) => void;
  createNote: (a: Omit<L.CreateArgs, "now">) => HelioNote | null;
  deposit: (noteId: string, amount: number) => void;
  withdraw: (noteId: string, amount: number) => void;
  failNote: (noteId: string) => void;
  markBuilt: (noteId: string, dayOne: boolean) => void;
  markPto: (noteId: string) => void;
  recordTakeout: (noteId: string, amount: number) => void;
  releaseCollateral: (noteId: string) => void;
}

// Keep one context object across hot reloads so providers and consumers always match.
const g = globalThis as { __helioCtx?: React.Context<HelioContextValue | null> };
const Ctx = (g.__helioCtx ??= createContext<HelioContextValue | null>(null));
const roleWallet: Record<Role, Address> = { investor: DEMO.investor, admin: DEMO.admin, installer: DEMO.installer };
const walletRole = (w: Address | null): Role | null => (w === DEMO.admin ? "admin" : w === DEMO.installer ? "installer" : w ? "investor" : null);
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
  const me = useCallback((): Address => {
    if (!wallet) throw new L.HelioError("NoWallet", "Connect a wallet first — use the wallet menu in the header.");
    return wallet;
  }, [wallet]);

  const value = useMemo<HelioContextValue>(() => {
    const s = state ?? seedState(0);
    const simple = (label: string, f: (st: LedgerState, t: number) => LedgerState) => run(label, (st, t) => ({ state: f(st, t), result: null }));
    return {
      ready: state !== null,
      state: s,
      now,
      wallet,
      role: walletRole(wallet),
      balance: wallet ? L.balanceOf(s, wallet) : 0,
      connect: (role) => {
        setWallet(roleWallet[role]);
        toast.success(`Connected ${role === "admin" ? "oracle admin" : role === "installer" ? "installer" : "demo lender"}`, { description: L.short(roleWallet[role]) });
      },
      disconnect: () => setWallet(null),
      resetDemo: () => {
        setState(seedState(nowSec()));
        toast.success("Demo reseeded", { description: "2 filling · 1 funded · 1 repaid" });
      },
      faucet: (amount = 10_000) => simple("Faucet", (st, t) => L.faucet(st, me(), amount, t)),
      createNote: (a) =>
        run("Note created", (st, t) => {
          const r = L.createNote(st, me(), { ...a, now: t });
          return { state: r.state, result: r.note };
        }),
      deposit: (noteId, amount) => simple("Deposited", (st, t) => L.deposit(st, { lender: me(), noteId, amount, now: t })),
      withdraw: (noteId, amount) => simple("Withdrawn", (st, t) => L.withdraw(st, { lender: me(), noteId, amount, now: t })),
      failNote: (noteId) => simple("Note failed", (st, t) => L.failNote(st, me(), noteId, t)),
      markBuilt: (noteId, dayOne) => simple("Marked built", (st, t) => L.markBuilt(st, me(), noteId, dayOne, t)),
      markPto: (noteId) => simple("PTO recorded", (st, t) => L.markPto(st, me(), noteId, t)),
      recordTakeout: (noteId, amount) => simple("Takeout settled", (st, t) => L.recordTakeout(st, me(), noteId, amount, t)),
      releaseCollateral: (noteId) => simple("Collateral released", (st, t) => L.releaseCollateral(st, me(), noteId, t)),
    };
  }, [state, now, wallet, run, me]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHelio(): HelioContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useHelio must be used inside <HelioProvider>");
  return v;
}
