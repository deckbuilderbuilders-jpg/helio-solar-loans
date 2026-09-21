import { describe, expect, it } from "vitest";
import { FLAGSHIP_ESS_SPECS, FLAGSHIP_SPECS, computeTakeout, recPriceTier } from "./takeout";
import { fundingTarget, panelsRequired, underwrite } from "./panels";
import { ORIGINATOR_TAIL_BPS } from "./constants";

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

describe("panel underwriting", () => {
  it("needs 30 panels and $12,000 for the flagship 12 kW-DC job", () => {
    expect(fundingTarget(12)).toBe(12_000);
    expect(panelsRequired(12)).toBe(30);
    const u = underwrite(FLAGSHIP_SPECS, ORIGINATOR_TAIL_BPS);
    expect(u.panelsRequired).toBe(30);
    expect(u.panelCost).toBe(12_000);
    near(u.takeoutPerPanel, 12_150 / 30, 1);
    // 80% of the ~$9,918 tail split over 30 panels
    near(u.tailPerPanel, (9_918 * 0.8) / 30, 2);
    expect(u.multiple).toBeGreaterThan(1);
  });

  it("rounds partial panels up", () => {
    expect(panelsRequired(9.6)).toBe(24);
    expect(panelsRequired(5.1)).toBe(13);
  });

  it("adds the $4,050 battery rebate to takeout per panel", () => {
    const base = underwrite(FLAGSHIP_SPECS, ORIGINATOR_TAIL_BPS);
    const ess = underwrite(FLAGSHIP_ESS_SPECS, ORIGINATOR_TAIL_BPS);
    near(ess.takeout - base.takeout, 4_050 * 0.97, 5);
    expect(ess.takeoutPerPanel).toBeGreaterThan(base.takeoutPerPanel);
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
