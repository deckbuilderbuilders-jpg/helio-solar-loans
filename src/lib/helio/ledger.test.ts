import { describe, expect, it } from "vitest";
import { pointsForFill, pointsMultiplier } from "./auction";
import { APR_MAX, APR_MIN, aprForCoverage, projectEconomics } from "./economics";
import { balanceOf, createNote, deposit, econOf, faucet, failNote, lenderInterest, markBuilt, markPto, recordTakeout, releaseCollateral, withdraw } from "./ledger";
import { defaultRecInputs, estimateRecQuantity, recContract } from "./rec";
import { DEMO, emptyState, seedState } from "./seed";

const NOW = 1_790_000_000;
const H = 3600,
  D = 86400;

function open(rec = defaultRecInputs(10)) {
  let s = emptyState();
  s = faucet(s, DEMO.investor, 50_000, NOW);
  s = faucet(s, DEMO.whale, 50_000, NOW);
  const r = createNote(s, DEMO.investor, { name: "T", city: "C", address: "A", kwDc: 10, batteryKwh: 64, rec, now: NOW });
  return { s: r.state, id: r.note.id };
}

describe("REC engine", () => {
  it("matches the spec's worked example (Group B, 7.5 kW AC, customer-owned, 148 RECs)", () => {
    const r = recContract({ ...defaultRecInputs(9), kwAc: 7.5, capacityFactor: 0.158, group: "B", partIQty: 150, partIIQty: 148 });
    expect(r.price).toBeCloseTo(100.77);
    expect(r.quantity).toBe(148);
    expect(r.contractValue).toBeCloseTo(14_913.96, 2);
    expect(r.firstPct).toBe(0.5);
  });
  it("estimates quantity with 0.5%/yr degradation, floored", () => {
    // 7.5 × 0.158 × 8.76 = 10.3806 MWh/yr × Σ0.995^t (15 yrs ≈ 14.48)
    expect(estimateRecQuantity(7.5, 0.158)).toBe(150);
  });
  it("applies bins, adders and Large DG schedule", () => {
    expect(recContract({ ...defaultRecInputs(10), kwAc: 20, customerOwned: false }).price).toBeCloseTo(60.92);
    expect(recContract({ ...defaultRecInputs(10), eec: true }).price).toBeCloseTo(95.37);
    const big = recContract({ ...defaultRecInputs(10), kwAc: 50, customerOwned: true });
    expect(big.adders).toBe(0);
    expect(big.firstPct).toBe(0.15);
  });
});

describe("APR from coverage", () => {
  it("is 24% at 1.12x, 18% at 1.30x, linear between", () => {
    expect(aprForCoverage(1.12)).toBeCloseTo(APR_MAX);
    expect(aprForCoverage(1.3)).toBeCloseTo(APR_MIN);
    expect(aprForCoverage(1.21)).toBeCloseTo(0.21);
    expect(aprForCoverage(2)).toBeCloseTo(APR_MIN);
  });
  it("prices scenarios inside 18–24%", () => {
    const a = projectEconomics(10);
    const b = projectEconomics(10, 64, { group: "B" });
    const shaded = projectEconomics(10, 64, { capacityFactor: 0.14 });
    for (const e of [a, b, shaded]) {
      expect(e.apr).toBeGreaterThanOrEqual(APR_MIN - 1e-9);
      expect(e.apr).toBeLessThanOrEqual(APR_MAX + 1e-9);
    }
    expect(b.apr).toBeLessThan(a.apr);
    expect(shaded.apr).toBeGreaterThan(a.apr);
  });
  it("refuses undercovered roofs", () => {
    expect(() => open(defaultRecInputs(10, { capacityFactor: 0.05 }))).toThrow(/below/);
  });
});

describe("points", () => {
  it("2x empty → 1x full; one deposit equals many", () => {
    expect(pointsMultiplier(0)).toBe(2);
    expect(pointsMultiplier(1)).toBe(1);
    expect(pointsForFill(100, 0, 1)).toBeCloseTo(150);
    expect(pointsForFill(100, 0, 0.5) + pointsForFill(100, 0.5, 1)).toBeCloseTo(150);
  });
});

describe("note lifecycle", () => {
  it("accrues interest from each deposit and settles with factoring", () => {
    let { s, id } = open();
    const e = econOf(s.notes.find((n) => n.id === id)!);
    s = deposit(s, { lender: DEMO.whale, noteId: id, amount: 20_000, now: NOW });
    s = deposit(s, { lender: DEMO.investor, noteId: id, amount: 50_000, now: NOW + 10 * D });
    let n = s.notes.find((x) => x.id === id)!;
    expect(n.stage).toBe(2);
    expect(n.points[DEMO.whale]! / 20_000).toBeGreaterThan(n.points[DEMO.investor]! / 7_500);
    const settle = NOW + 10 * D + 120 * D;
    expect(lenderInterest(n, DEMO.whale, settle)).toBeCloseTo(20_000 * n.apr * (130 / 365), 2);
    expect(lenderInterest(n, DEMO.investor, settle)).toBeCloseTo(7_500 * n.apr * (120 / 365), 2);
    s = markBuilt(s, DEMO.admin, id, true, NOW + 12 * D);
    s = markPto(s, DEMO.admin, id, NOW + 60 * D);
    const whaleBefore = balanceOf(s, DEMO.whale);
    s = recordTakeout(s, DEMO.admin, id, e.takeout, settle);
    n = s.notes.find((x) => x.id === id)!;
    expect(n.stage).toBe(5);
    expect(n.factorProceeds).toBeCloseTo(e.factorProceeds);
    expect(balanceOf(s, DEMO.whale) - whaleBefore).toBeCloseTo(20_000 + 20_000 * n.apr * (130 / 365), 2);
    expect(n.creatorPaid).toBeCloseTo(e.creatorTotal);
    const t0 = balanceOf(s, DEMO.treasury);
    s = releaseCollateral(s, DEMO.admin, id, settle + 30 * D);
    expect(balanceOf(s, DEMO.treasury) - t0).toBeCloseTo(e.recCollateral);
    expect(s.notes.find((x) => x.id === id)!.stage).toBe(6);
  });

  it("withdraw charges 2.5% and forfeits points pro-rata; fail refunds", () => {
    let { s, id } = open();
    s = deposit(s, { lender: DEMO.whale, noteId: id, amount: 10_000, now: NOW + H });
    const p0 = s.notes.find((x) => x.id === id)!.points[DEMO.whale]!;
    s = withdraw(s, { lender: DEMO.whale, noteId: id, amount: 5_000, now: NOW + 2 * H });
    expect(s.notes.find((x) => x.id === id)!.points[DEMO.whale]).toBeCloseTo(p0 / 2);
    expect(balanceOf(s, DEMO.whale)).toBeCloseTo(40_000 + 5_000 * 0.975);
    s = failNote(s, DEMO.admin, id, NOW + 3 * H);
    expect(balanceOf(s, DEMO.whale)).toBeCloseTo(50_000 - 50);
  });

  it("seeds without throwing", () => {
    const s = seedState(NOW);
    expect(s.notes).toHaveLength(4);
    const aprs = new Set(s.notes.map((n) => n.apr.toFixed(3)));
    expect(aprs.size).toBeGreaterThan(2);
  });
});
