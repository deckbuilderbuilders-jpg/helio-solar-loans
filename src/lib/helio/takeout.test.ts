import { describe, expect, it } from "vitest";
import { FLAGSHIP_SPECS, computeTakeout, recPriceTier } from "./takeout";

const near = (actual: number, expected: number, tol = 5) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);

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
