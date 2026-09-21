import type { ProjectSpecs, TakeoutBreakdown } from "./takeout";

export type Address = string;

export type Gate = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ProjectStatus = "Bonding" | "Funded" | "Energized" | "Paying" | "Complete";

export type PayoutKind = "rebate" | "rec" | "tail";

export interface Payout {
  id: string;
  kind: PayoutKind;
  amount: number;
  /** Split actually credited to Project Shares. */
  toShares: number;
  /** Originator cut (tail only). */
  toOriginator: number;
  at: number;
  memo: string;
}

export interface Bond {
  id: string;
  projectId: string;
  holder: Address;
  panels: number;
  at: number;
}

export interface HelioProject {
  id: string;
  name: string;
  city: string;
  address: string;
  utility: "Ameren Illinois";
  rateClass: "DS-1" | "DS-2";
  tradeDate: number;
  energizationDeadline: number;
  specs: ProjectSpecs;
  takeout: TakeoutBreakdown;
  fundingTarget: number;
  panelsRequired: number;
  panelsBonded: number;
  gate: Gate;
  payouts: Payout[];
  /** USDC already claimed, per holder. */
  claims: Record<Address, number>;
  originatorEarned: number;
  createdAt: number;
}

export interface TxLogEntry {
  id: string;
  at: number;
  ix: string;
  signer: Address;
  detail: string;
}

export interface LedgerState {
  config: {
    admin: Address;
    treasury: Address;
    usdcMint: Address;
    panelMint: Address;
    originatorTailBps: number;
  };
  /** Panels left in the shop. */
  shopStock: number;
  panelsMinted: number;
  panelsBurned: number;
  balances: Record<Address, number>;
  /** Unbonded panels held, per wallet. */
  panels: Record<Address, number>;
  projects: HelioProject[];
  bonds: Bond[];
  log: TxLogEntry[];
  counter: number;
}
