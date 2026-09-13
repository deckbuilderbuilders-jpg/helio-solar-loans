import { describe, expect, it } from "vitest";
import {
  FLAGSHIP_ESS_SPECS,
  FLAGSHIP_SPECS,
  computeTakeout,
  interestFor,
  interestMicro,
  quoteLoan,
  recPriceTier,
  toMicro,
} from "./takeout";
import { PROTOCOL_FEE_BPS } from "./constants";

const near = (actual: number, expected: number, tol = 5) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);

describe("flagship 10 kW AC / 12 kW DC customer-owned EEC project", () => {
  const t = computeTakeout(FLAGSHIP_SPECS);

  it("prices RECs at $70.37 + $20 + $5 = $95.37", () => {
    expect(t.basePrice).toBe(70.37);
    expect(t.customerOwnedAdder).toBe(20);
    expect(t.eecAdder).toBe(5);
    expect(t.effectivePrice).toBeCloseTo(95.37, 2);
  });

  it("produces ≈14.38 year-1 RECs and 208 contract RECs", () => {
    expect(t.year1Recs).toBeCloseTo(14.38, 1);
    expect(t.totalRecs).toBe(208);
  });

  it("matches the spec dollar figures within ±$5", () => {
    expect(t.installCost).toBe(12_000);
    near(t.recPurchaseAmount, 19_837);
    near(t.firstRecPayment, 9_918);
    near(t.recTail, 9_918);
    near(t.recCollateralLock, 992);
    expect(t.amerenSolarRebate).toBe(3_600);
    expect(t.amerenBatteryRebate).toBe(0);
    near(t.takeout, 12_150);
  });

  it("lends ~$9,720 at 80% LTV on the G3 60-day 24% book", () => {
    const q = quoteLoan(t.takeout, {
      ltvBps: 8000,
      termDays: 60,
      apyBps: 2400,
      originationBps: 150,
      protocolFeeBps: PROTOCOL_FEE_BPS,
    });
    near(q.principal, 9_720);
    // principal × 0.24 × 60/365 — the on-chain formula
    near(q.interest, 9_720 * 0.24 * (60 / 365), 5);
    // borrower still clears roughly $2k cash after repay + origination
    expect(q.borrowerResidualAfterTakeout).toBeGreaterThan(1_800);
    expect(q.borrowerResidualAfterTakeout).toBeLessThan(2_200);
    expect(q.lenderNetApyPct).toBeCloseTo(21.6, 5);
  });
});

describe("battery variant", () => {
  it("adds $4,050 rebate and lifts the loan to ~$13k", () => {
    const t = computeTakeout(FLAGSHIP_ESS_SPECS);
    expect(t.amerenBatteryRebate).toBe(4_050);
    const base = computeTakeout(FLAGSHIP_SPECS);
    near(t.takeout - base.takeout, 4_050 * 0.97, 5);
    const q = quoteLoan(t.takeout, {
      ltvBps: 8000,
      termDays: 60,
      apyBps: 2400,
      originationBps: 150,
      protocolFeeBps: PROTOCOL_FEE_BPS,
    });
    expect(q.principal).toBeGreaterThan(12_500);
    expect(q.principal).toBeLessThan(13_500);
  });
});

describe("REC tiers and Large DG", () => {
  it("picks the right Group A tier", () => {
    expect(recPriceTier(10).price).toBe(70.37);
    expect(recPriceTier(10.01).price).toBe(60.92);
    expect(recPriceTier(25).price).toBe(60.92);
    expect(recPriceTier(100).price).toBe(59.53);
    expect(recPriceTier(2000).price).toBe(42.37);
    expect(() => recPriceTier(5001)).toThrow();
  });

  it("Large DG pays 15% first and drops the customer-owned adder", () => {
    const t = computeTakeout({ kwAc: 100, kwDc: 120, batteryKwh: 0, customerOwned: true, eec: true });
    expect(t.isSmallDg).toBe(false);
    expect(t.firstPaymentPct).toBe(0.15);
    expect(t.customerOwnedAdder).toBe(0);
    expect(t.eecAdder).toBe(5);
  });
});

describe("interest formula parity with the program", () => {
  it("float and u64 paths agree to the micro-USDC", () => {
    const principal = 9_720.66;
    const f = interestFor(principal, 2400, 60 * 86400);
    const u = interestMicro(toMicro(principal), 2400n, BigInt(60 * 86400));
    expect(Math.abs(Number(u) / 1e6 - f)).toBeLessThan(0.000002);
  });
});
