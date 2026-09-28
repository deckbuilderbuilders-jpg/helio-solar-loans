/**
 * Seed: one live auction (Springfield), one funded note awaiting build (Decatur),
 * one repaid note streaming tail to Yield NFTs (Charleston, one NFT listed),
 * one fresh auction with no lenders yet (Pana).
 */
import { econOf, createNote, deposit, faucet, listNft, markBuilt, markPto, recordTail, recordTakeout, withdraw } from "./ledger";
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
    nfts: [],
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

  // Charleston — repaid, streaming tail.
  const cStart = now - 150 * D;
  const charleston = create(DEMO.retail, { name: "Lincoln St — Charleston", city: "Charleston, IL", address: "412 Lincoln St", kwAc: 10, kwDc: 10, batteryKwh: 64 }, cStart);
  dep(DEMO.whale, charleston, 20_000, cStart + 20 * H);
  dep(DEMO.investor, charleston, 7_500, cStart + 40 * H);
  s = markBuilt(s, DEMO.admin, charleston, true, cStart + 4 * D);
  s = markPto(s, DEMO.admin, charleston, cStart + 50 * D);
  const cNote = s.notes.find((n) => n.id === charleston)!;
  s = recordTakeout(s, DEMO.admin, charleston, econOf(cNote).takeout, cStart + 40 * H + 118 * D);
  const e = econOf(cNote);
  s = recordTail(s, DEMO.admin, charleston, e.recTailPerQuarter, now - 3 * D);
  const whaleNft = s.nfts.find((x) => x.noteId === charleston && x.owner === DEMO.whale)!;
  s = listNft(s, DEMO.whale, whaleNft.id, 9_800, now - 2 * D);

  // Decatur — funded, awaiting build.
  const dStart = now - 20 * D;
  const decatur = create(DEMO.whale, { name: "Oakland Ave — Decatur", city: "Decatur, IL", address: "1780 N Oakland Ave", kwAc: 8, kwDc: 8, batteryKwh: 51 }, dStart);
  dep(DEMO.whale, decatur, 15_000, dStart + 6 * H);
  dep(DEMO.investor, decatur, 10_000, dStart + 26 * H);

  // Springfield — live auction.
  const sStart = now - 30 * H;
  const springfield = create(DEMO.investor, { name: "Prairie Ave — Springfield", city: "Springfield, IL", address: "2211 S Prairie Ave", kwAc: 10, kwDc: 10, batteryKwh: 64 }, sStart);
  dep(DEMO.whale, springfield, 12_000, sStart + 2 * H);
  dep(DEMO.retail, springfield, 3_000, sStart + 10 * H);
  dep(DEMO.investor, springfield, 4_000, sStart + 20 * H);
  s = withdraw(s, { lender: DEMO.retail, noteId: springfield, amount: 1_000, now: sStart + 25 * H });

  // Pana — just opened.
  create(DEMO.investor, { name: "Locust St — Pana", city: "Pana, IL", address: "9 E Locust St", kwAc: 10, kwDc: 12, batteryKwh: 77 }, now - 2 * H);

  return s;
}
