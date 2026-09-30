/**
 * Seed: four roofs with different REC scenarios so APRs vary.
 *   Charleston  — repaid (Group A, customer-owned + EEC)
 *   Decatur     — funded, awaiting build (Group A, lower CF)
 *   Springfield — filling (Group A, customer-owned, default CF)
 *   Aurora      — just opened (Group B ComEd, customer-owned)
 */
import { createNote, deposit, econOf, faucet, markBuilt, markPto, recordTakeout, withdraw } from "./ledger";
import { defaultRecInputs } from "./rec";
import type { LedgerState } from "./types";

export const DEMO = {
  admin: "HeLioAdm1nORACLEmi1estoneWr1terDevnet1111111",
  treasury: "HeLioTreasuryProtocolVau1tDevnet111111111111",
  installer: "INSTa11erCrewPrairieSo1arDevnet2222222222222",
  investor: "INVdemoLenderWa11etDevnet55555555555555555555",
  whale: "WHALEdemoLenderDevnet7777777777777777777777",
  retail: "RETAILdemoLenderDevnet3333333333333333333333",
} as const;

export function emptyState(): LedgerState {
  return {
    config: { admin: DEMO.admin, treasury: DEMO.treasury, installer: DEMO.installer },
    balances: {},
    notes: [],
    log: [],
    counter: 0,
  };
}

const D = 86400;
const H = 3600;

export function seedState(now: number): LedgerState {
  let s = emptyState();
  const t0 = now - 200 * D;
  s = faucet(s, DEMO.investor, 25_000, t0);
  s = faucet(s, DEMO.whale, 150_000, t0);
  s = faucet(s, DEMO.retail, 10_000, t0);
  const create = (who: string, a: Omit<Parameters<typeof createNote>[2], "now">, at: number) => {
    const r = createNote(s, who, { ...a, now: at });
    s = r.state;
    return r.note.id;
  };
  const dep = (who: string, id: string, amount: number, at: number) => {
    s = deposit(s, { lender: who, noteId: id, amount, now: at });
  };

  // Charleston — repaid.
  const cStart = now - 150 * D;
  const charleston = create(
    DEMO.retail,
    { name: "Lincoln St — Charleston", city: "Charleston, IL", address: "412 Lincoln St", kwDc: 10, batteryKwh: 64, rec: defaultRecInputs(10, { eec: true, partIQty: 175, partIIQty: 173 }) },
    cStart,
  );
  dep(DEMO.whale, charleston, 20_000, cStart + 6 * H);
  dep(DEMO.investor, charleston, 7_500, cStart + 30 * H);
  s = markBuilt(s, DEMO.admin, charleston, true, cStart + 4 * D);
  s = markPto(s, DEMO.admin, charleston, cStart + 50 * D);
  const cNote = s.notes.find((n) => n.id === charleston)!;
  s = recordTakeout(s, DEMO.admin, charleston, econOf(cNote).takeout, cStart + 30 * H + 112 * D);

  // Decatur — funded, awaiting build. Shaded roof → lower CF → higher APR.
  const dStart = now - 20 * D;
  const decatur = create(
    DEMO.whale,
    { name: "Oakland Ave — Decatur", city: "Decatur, IL", address: "1780 N Oakland Ave", kwDc: 8, batteryKwh: 51, rec: defaultRecInputs(8, { capacityFactor: 0.148 }) },
    dStart,
  );
  dep(DEMO.whale, decatur, 12_000, dStart + 3 * H);
  dep(DEMO.investor, decatur, 20_000, dStart + 26 * H);

  // Springfield — filling.
  const sStart = now - 30 * H;
  const springfield = create(
    DEMO.investor,
    { name: "Prairie Ave — Springfield", city: "Springfield, IL", address: "2211 S Prairie Ave", kwDc: 10, batteryKwh: 64, rec: defaultRecInputs(10) },
    sStart,
  );
  dep(DEMO.whale, springfield, 12_000, sStart + 2 * H);
  dep(DEMO.retail, springfield, 3_000, sStart + 10 * H);
  dep(DEMO.investor, springfield, 4_000, sStart + 20 * H);
  s = withdraw(s, { lender: DEMO.retail, noteId: springfield, amount: 1_000, now: sStart + 25 * H });

  // Aurora — ComEd territory (Group B), just opened.
  create(
    DEMO.investor,
    { name: "Galena Blvd — Aurora", city: "Aurora, IL", address: "88 W Galena Blvd", kwDc: 12, batteryKwh: 77, rec: defaultRecInputs(12, { group: "B" }) },
    now - 2 * H,
  );

  return s;
}
