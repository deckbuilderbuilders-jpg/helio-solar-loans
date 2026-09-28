export type Address = string;

/**
 * Note lifecycle.
 * 0 Created  — creator paid the $20/kW application fee (at risk)
 * 1 Auction  — reverse Dutch auction open, APR climbing floor → cap
 * 2 Funded   — build fully funded, clearing APR locked, lockup starts
 * 3 Built    — installer paid base (+ day-one bonus)
 * 4 PTO      — Ameren Permission to Operate, rebates filed
 * 5 Repaid   — takeout landed: lenders repaid principal + interest, creator 3x cash
 * 6 Tail     — PPA + REC tail streaming to Yield NFTs
 * 7 Complete — REC tail fully paid
 */
export type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type NoteStatus = "Auction" | "Funded" | "Building" | "Awaiting takeout" | "Repaid" | "Streaming" | "Complete" | "Failed";

export interface HelioNote {
  id: string;
  name: string;
  city: string;
  address: string;
  kwAc: number;
  kwDc: number;
  batteryKwh: number;
  creator: Address;
  applicationFee: number;
  stage: Stage;
  failed: boolean;
  openedAt: number;
  /** Live principal per lender while the auction is open. */
  deposits: Record<Address, number>;
  /** Exit-fee redistribution owed to lenders who stayed (1.5% of each withdrawal). */
  exitBonus: Record<Address, number>;
  clearingApr: number | null;
  fundedAt: number | null;
  dayOne: boolean | null;
  /** Takeout waterfall results. */
  takeoutReceived: number;
  lendersRepaid: number;
  creatorPaid: number;
  /** Long tail. */
  tailQuarters: number;
  tailReceived: number;
  /** Cumulative USDC distributed per $1 of Yield NFT weight. */
  accPerWeight: number;
  totalWeight: number;
  helioEarned: number;
  installerEarned: number;
  createdAt: number;
}

export interface YieldNft {
  id: string;
  noteId: string;
  owner: Address;
  /** Dollar weight: lender principal, or the creator's 2x fee credit. */
  weight: number;
  kind: "lender" | "creator";
  /** USDC already pulled by holders of this NFT. */
  claimed: number;
  listPrice: number | null;
}

export interface TxLogEntry {
  id: string;
  at: number;
  ix: string;
  signer: Address;
  detail: string;
}

export interface LedgerState {
  config: { admin: Address; treasury: Address; installer: Address };
  balances: Record<Address, number>;
  notes: HelioNote[];
  nfts: YieldNft[];
  log: TxLogEntry[];
  counter: number;
}
