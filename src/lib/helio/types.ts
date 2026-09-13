import type { ProjectSpecs, TakeoutBreakdown } from "./takeout";

export type Address = string;

export type Gate = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Collection {
  slug: string;
  name: string;
  description: string;
  /** Minimum gate a project must have reached to accept an offer here. */
  gateMin: Gate;
  ltvBps: number;
  defaultApyBps: number;
  termSeconds: number;
  /** Spec filter */
  maxKwAc: number;
  minKwAc: number;
  requiresBattery: boolean | null;
}

export type OfferState = "Open" | "Taken" | "Cancelled";

export interface Offer {
  id: string;
  lender: Address;
  collection: string;
  principal: number;
  apyBps: number;
  originationBps: number;
  termSeconds: number;
  minGate: Gate;
  createdAt: number;
  expiresAt: number;
  state: OfferState;
}

export interface Project {
  id: string;
  borrower: Address;
  collection: string;
  name: string;
  address: string;
  utility: "Ameren Illinois";
  rateClass: "DS-1" | "DS-2";
  tradeDate: number;
  energizationDeadline: number;
  specs: ProjectSpecs;
  takeout: TakeoutBreakdown;
  gate: Gate;
  noteMint: Address;
  noteFrozen: boolean;
  noteOwner: Address;
  activeLoanId: string | null;
  createdAt: number;
}

export type LoanState = "Active" | "Extended" | "Repaid" | "Defaulted" | "Foreclosed";

export interface EscrowPayment {
  id: string;
  kind: "rebate" | "rec";
  amount: number;
  at: number;
  memo: string;
}

export interface Loan {
  id: string;
  offerId: string;
  projectId: string;
  lender: Address;
  borrower: Address;
  collection: string;
  principal: number;
  apyBps: number;
  originationBps: number;
  originationPaid: number;
  startAt: number;
  expiresAt: number;
  termSeconds: number;
  extended: boolean;
  state: LoanState;
  /** USDC currently sitting in the loan escrow (from takeout payments). */
  escrowBalance: number;
  payments: EscrowPayment[];
  principalRepaid: number;
  interestPaid: number;
  protocolCutPaid: number;
  residualToBorrower: number;
  closedAt: number | null;
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
    protocolFeeBps: number;
    treasuryBalance: number;
  };
  balances: Record<Address, number>;
  collections: Collection[];
  offers: Offer[];
  projects: Project[];
  loans: Loan[];
  log: TxLogEntry[];
  counter: number;
}
