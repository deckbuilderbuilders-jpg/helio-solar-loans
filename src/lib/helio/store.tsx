/**
 * HelioProvider — holds the simulated devnet ledger, the connected demo wallet and a live clock.
 * State persists to localStorage so a judge can reload mid-demo; "Reset demo" re-runs the seed.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import * as L from "./ledger";
import { DEMO, seedState } from "./seed";
import type { Address, Gate, LedgerState, Loan, Offer, Project } from "./types";
import type { ProjectSpecs } from "./takeout";

const STORAGE_KEY = "helio:devnet-sim:v1";
const WALLET_KEY = "helio:wallet:v1";

export type Role = "lender" | "av" | "admin";

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
  postOffer: (a: Omit<L.PostOfferArgs, "lender" | "now">) => Offer | null;
  cancelOffer: (offerId: string) => void;
  listProject: (a: { name: string; address: string; rateClass: "DS-1" | "DS-2"; specs: ProjectSpecs; gate?: Gate }) => Project | null;
  acceptOffer: (offerId: string, projectId: string) => Loan | null;
  setGate: (projectId: string, gate: Gate) => void;
  recordPayment: (loanId: string, kind: "rebate" | "rec", amount: number, memo: string) => void;
  repay: (loanId: string, walletAmount: number) => void;
  extend: (loanId: string) => void;
  foreclose: (loanId: string) => void;
  claimFees: () => void;
}

const Ctx = createContext<HelioContextValue | null>(null);

const roleWallet: Record<Role, Address> = { lender: DEMO.lender, av: DEMO.av, admin: DEMO.admin };
const walletRole = (w: Address | null): Role | null =>
  w === DEMO.lender ? "lender" : w === DEMO.av ? "av" : w === DEMO.admin ? "admin" : null;

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

  /** Run an instruction against the ledger, surfacing HelioError messages as toasts. */
  const run = useCallback(
    <T,>(label: string, fn: (s: LedgerState, now: number) => { state: LedgerState; result: T }): T | null => {
      if (!state) return null;
      try {
        const { state: next, result } = fn(state, nowSec());
        setState(next);
        const last = next.log[0];
        toast.success(label, { description: last?.detail });
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(`${label} failed`, { description: msg });
        return null;
      }
    },
    [state],
  );

  const requireWallet = useCallback((): Address => {
    if (!wallet) {
      throw new L.HelioError("NoWallet", "Connect a wallet first — use “Load demo lender” or “Load demo AV” in the header.");
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
      connect: (role) => {
        setWallet(roleWallet[role]);
        toast.success(`Connected ${role === "lender" ? "demo lender" : role === "av" ? "demo Approved Vendor" : "oracle admin"}`, {
          description: L.short(roleWallet[role]),
        });
      },
      disconnect: () => setWallet(null),
      resetDemo: () => {
        setState(seedState(nowSec()));
        toast.success("Demo reseeded", { description: "4 collections · 8 offers · 6 projects · 4 loans" });
      },
      faucet: (amount = 10_000) =>
        run("Faucet", (st, t) => {
          const w = requireWallet();
          return { state: L.faucet(st, w, amount, t), result: null };
        }),
      postOffer: (a) =>
        run("Offer posted", (st, t) => {
          const r = L.postOffer(st, { ...a, lender: requireWallet(), now: t });
          return { state: r.state, result: r.offer };
        }),
      cancelOffer: (offerId) =>
        run("Offer cancelled", (st, t) => ({ state: L.cancelOffer(st, requireWallet(), offerId, t), result: null })),
      listProject: (a) =>
        run("Project Note minted", (st, t) => {
          const r = L.listProject(st, { ...a, borrower: requireWallet(), now: t });
          return { state: r.state, result: r.project };
        }),
      acceptOffer: (offerId, projectId) =>
        run("Loan originated", (st, t) => {
          const r = L.acceptOffer(st, { borrower: requireWallet(), offerId, projectId, now: t });
          return { state: r.state, result: r.loan };
        }),
      setGate: (projectId, gate) =>
        run(`Gate set to G${gate}`, (st, t) => ({ state: L.adminSetGate(st, requireWallet(), projectId, gate, t), result: null })),
      recordPayment: (loanId, kind, amount, memo) =>
        run(kind === "rebate" ? "Ameren rebate credited" : "REC payment credited", (st, t) => ({
          state: L.recordTakeoutPayment(st, { signer: requireWallet(), loanId, kind, amount, memo, now: t }),
          result: null,
        })),
      repay: (loanId, walletAmount) =>
        run("Repayment processed", (st, t) => {
          const r = L.repay(st, { signer: requireWallet(), loanId, walletAmount, now: t });
          return { state: r.state, result: null };
        }),
      extend: (loanId) => run("Loan extended", (st, t) => ({ state: L.extend(st, requireWallet(), loanId, t), result: null })),
      foreclose: (loanId) => run("Foreclosed", (st, t) => ({ state: L.foreclose(st, requireWallet(), loanId, t), result: null })),
      claimFees: () => run("Fees claimed", (st, t) => ({ state: L.claimFees(st, requireWallet(), t), result: null })),
    };
  }, [state, now, wallet, run, requireWallet]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHelio(): HelioContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useHelio must be used inside <HelioProvider>");
  return v;
}
