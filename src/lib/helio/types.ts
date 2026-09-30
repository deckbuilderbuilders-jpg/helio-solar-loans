import type { RecInputs } from "./rec";

export type Address = string;

/**
 * Note lifecycle.
 * 0 Created  — creator paid the $20/kW application fee (at risk)
 * 1 Filling  — open for deposits at the note's fixed APR; points 2x → 1x
 * 2 Funded   — build fully funded, lockup starts
 * 3 Built    — installer paid base (+ day-one bonus)
 * 4 PTO      — Permission to Operate, rebates filed
 * 5 Repaid   — takeout + factored REC tail landed: lenders P+I, creator 5x, installer, HELIO
 * 6 Closed   — 5% REC collateral released to HELIO
 */
export type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type NoteStatus = "Filling" | "Funded" | "Building" | "Awaiting takeout" | "Repaid" | "Closed" | "Failed";

/** The imported Illinois Shines application, as recorded with the note. */
export interface ApplicationRecord {
  fileName: string;
  /** SHA-256 of the uploaded file, hex. Empty when entered by hand. */
  fileHash: string;
  /** Fields the creator changed after extraction. */
  editedFields: string[];
  importedAt: number;
}

export interface HelioNote {
  id: string;
  name: string;
  city: string;
  address: string;
  kwAc: number;
  kwDc: number;
  batteryKwh: number;
  rec: RecInputs;
  application: ApplicationRecord | null;
  creator: Address;
  applicationFee: number;
  /** Fixed at creation from REC coverage. */
  apr: number;
  stage: Stage;
  failed: boolean;
  openedAt: number;
  deposits: Record<Address, number>;
  /** Σ amount × deposit time (sec), per lender — interest accrues from each deposit. */
  timeDollars: Record<Address, number>;
  points: Record<Address, number>;
  exitBonus: Record<Address, number>;
  fundedAt: number | null;
  dayOne: boolean | null;
  takeoutReceived: number;
  factorProceeds: number;
  lendersRepaid: number;
  creatorPaid: number;
  installerEarned: number;
  helioEarned: number;
  collateralReleased: boolean;
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
  config: { admin: Address; treasury: Address; installer: Address };
  balances: Record<Address, number>;
  notes: HelioNote[];
  log: TxLogEntry[];
  counter: number;
}
