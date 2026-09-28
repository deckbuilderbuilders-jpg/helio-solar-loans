import { describe, expect, it } from "vitest";
import { buyNft, claimNft, createNote, deposit, econOf, faucet, failNote, listNft, markBuilt, markPto, recordTail, recordTakeout, releaseCollateral, withdraw, balanceOf } from "./ledger";
import { DEMO, emptyState, seedState } from "./seed";

const NOW = 1_790_000_000;
const H = 3600, D = 86400;

function open() {
  let s = emptyState();
  s = faucet(s, DEMO.investor, 50_000, NOW);
  s = faucet(s, DEMO.whale, 50_000, NOW);
  const r = createNote(s, DEMO.investor, { name: "T", city: "C", address: "A", kwAc: 10, kwDc: 10, batteryKwh: 64, now: NOW });
  return { s: r.state, id: r.note.id };
}

describe("bridge note lifecycle", () => {
  it("prices a 10 kW + 64 kWh roof", () => {
    const { s, id } = open();
    const e = econOf(s.notes.find((n) => n.id === id)!);
    expect(e.buildCost).toBe(27_500);
    expect(e.grossTakeout).toBe(30_650);
    expect(e.recCollateral).toBeCloseTo(845);
    expect(e.takeout).toBeCloseTo(29_805);
    expect(e.applicationFee).toBe(200);
    expect(balanceOf(s, DEMO.investor)).toBe(49_800);
  });

  it("locks the clearing APR on fill, repays P+I, pays creator 3x, streams tail", () => {
    let { s, id } = open();
    s = deposit(s, { lender: DEMO.whale, noteId: id, amount: 20_000, now: NOW });
    s = deposit(s, { lender: DEMO.investor, noteId: id, amount: 99_000, now: NOW + 36 * H });
    const n = s.notes.find((x) => x.id === id)!;
    expect(n.stage).toBe(2);
    expect(n.clearingApr).toBeCloseTo(0.185, 3);
    const nfts = s.nfts.filter((x) => x.noteId === id);
    expect(nfts).toHaveLength(3);
    // Early whale: 1.8x weight at 12%. Late investor (7,500 filled at 36h): 1.4x at 18.5%.
    expect(nfts.find((x) => x.owner === DEMO.whale)!.weight).toBeCloseTo(36_000);
    expect(nfts.find((x) => x.owner === DEMO.investor)!.weight).toBeCloseTo(7_500 * 1.4);
    s = markBuilt(s, DEMO.admin, id, true, NOW + 3 * D);
    expect(balanceOf(s, DEMO.installer)).toBe(3_500);
    s = markPto(s, DEMO.admin, id, NOW + 40 * D);
    const whaleBefore = balanceOf(s, DEMO.whale);
    s = recordTakeout(s, DEMO.admin, id, 30_650, NOW + 36 * H + 90 * D);
    expect(balanceOf(s, DEMO.whale) - whaleBefore).toBeCloseTo(20_000 * (1 + 0.12 * 90 / 365), 0);
    s = recordTail(s, DEMO.admin, id, 1_000, NOW + 100 * D);
    const nft = s.nfts.find((x) => x.owner === DEMO.whale)!;
    const r = claimNft(s, DEMO.whale, nft.id, NOW + 101 * D);
    expect(r.amount).toBeCloseTo(650 * 36_000 / (36_000 + 10_500 + 400), 2);
  });

  it("charges 2.5% on pre-fill withdrawals", () => {
    let { s, id } = open();
    s = deposit(s, { lender: DEMO.whale, noteId: id, amount: 10_000, now: NOW });
    s = deposit(s, { lender: DEMO.investor, noteId: id, amount: 1_000, now: NOW });
    const before = balanceOf(s, DEMO.whale);
    s = withdraw(s, { lender: DEMO.whale, noteId: id, amount: 10_000, now: NOW + H });
    expect(balanceOf(s, DEMO.whale) - before).toBe(9_750);
    expect(s.notes[0]!.exitBonus[DEMO.investor]).toBeCloseTo(150);
  });

  it("refunds lenders and burns the creator fee on failure", () => {
    let { s, id } = open();
    s = deposit(s, { lender: DEMO.whale, noteId: id, amount: 5_000, now: NOW });
    s = failNote(s, DEMO.admin, id, NOW + 80 * H);
    expect(balanceOf(s, DEMO.whale)).toBe(50_000);
    expect(balanceOf(s, DEMO.investor)).toBe(49_800);
  });

  it("trades Yield NFTs", () => {
    const s0 = seedState(NOW);
    const listed = s0.nfts.find((x) => x.listPrice !== null)!;
    const s1 = buyNft(s0, DEMO.investor, listed.id, NOW);
    expect(s1.nfts.find((x) => x.id === listed.id)!.owner).toBe(DEMO.investor);
    expect(() => listNft(s1, DEMO.whale, listed.id, 1, NOW)).toThrow();
  });

  it("defers creator cash to the tail when the collateral leaves a gap, then releases collateral to NFTs", () => {
    let { s, id } = open();
    s = deposit(s, { lender: DEMO.whale, noteId: id, amount: 27_500, now: NOW + 72 * H });
    s = markBuilt(s, DEMO.admin, id, true, NOW + 80 * H);
    s = markPto(s, DEMO.admin, id, NOW + 40 * D);
    const e = econOf(s.notes.find((x) => x.id === id)!);
    const whaleBefore = balanceOf(s, DEMO.whale);
    s = recordTakeout(s, DEMO.admin, id, e.takeout, NOW + 72 * H + 120 * D);
    const interest = 27_500 * 0.25 * 120 / 365;
    expect(balanceOf(s, DEMO.whale) - whaleBefore).toBeCloseTo(27_500 + interest, 0);
    let n = s.notes.find((x) => x.id === id)!;
    const owed = 600 - (29_805 - 27_500 - interest);
    expect(n.creatorOwed).toBeCloseTo(owed, 0);
    const creatorBefore = balanceOf(s, DEMO.investor);
    s = recordTail(s, DEMO.admin, id, e.recTailPerQuarter, NOW + 200 * D);
    expect(balanceOf(s, DEMO.investor) - creatorBefore).toBeCloseTo(e.recTailPerQuarter, 0);
    s = recordTail(s, DEMO.admin, id, e.recTailPerQuarter, NOW + 290 * D);
    expect(balanceOf(s, DEMO.investor) - creatorBefore).toBeCloseTo(owed, 0);
    n = s.notes.find((x) => x.id === id)!;
    expect(n.creatorOwed).toBeCloseTo(0);
    const acc = n.accPerWeight;
    s = releaseCollateral(s, DEMO.admin, id, NOW + 400 * D);
    n = s.notes.find((x) => x.id === id)!;
    expect((n.accPerWeight - acc) * n.totalWeight).toBeCloseTo(845);
    expect(() => releaseCollateral(s, DEMO.admin, id, NOW + 401 * D)).toThrow();
  });
});
