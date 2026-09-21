import { describe, expect, it } from "vitest";
import { bondPanels, buyPanels, claim, claimable, faucet, originateProject, projectStatus, recordTakeoutPayment, sharePct } from "./ledger";
import { DEMO, emptyState, seedState } from "./seed";
import { FLAGSHIP_SPECS } from "./takeout";
import type { LedgerState } from "./types";

const NOW = 1_790_000_000;

function withJob(): { state: LedgerState; projectId: string } {
  let s = emptyState();
  s = faucet(s, DEMO.investor, 20_000, NOW);
  const r = originateProject(s, DEMO.admin, {
    name: "Test — Springfield",
    city: "Springfield, IL",
    address: "1 Test St",
    rateClass: "DS-1",
    specs: FLAGSHIP_SPECS,
    tradeDate: NOW,
    now: NOW,
  });
  return { state: r.state, projectId: r.project.id };
}

describe("panel shop", () => {
  it("mints panels at $400 and debits the buyer", () => {
    const { state } = withJob();
    const s = buyPanels(state, { buyer: DEMO.investor, count: 5, now: NOW }).state;
    expect(s.panels[DEMO.investor]).toBe(5);
    expect(s.balances[DEMO.investor]).toBe(20_000 - 2_000);
    expect(s.balances[DEMO.treasury]).toBe(2_000);
    expect(s.shopStock).toBe(495);
  });

  it("refuses more panels than the wallet can pay for", () => {
    const { state } = withJob();
    expect(() => buyPanels(state, { buyer: DEMO.investor, count: 100, now: NOW })).toThrow(/holds/);
  });
});

describe("bonding burns panels permanently", () => {
  it("mints a share equal to panels ÷ panels required", () => {
    const { state, projectId } = withJob();
    let s = buyPanels(state, { buyer: DEMO.investor, count: 6, now: NOW }).state;
    s = bondPanels(s, { holder: DEMO.investor, projectId, panels: 6, now: NOW }).state;
    expect(s.panels[DEMO.investor]).toBe(0);
    expect(s.panelsBurned).toBe(6);
    const p = s.projects[0]!;
    expect(p.panelsRequired).toBe(30);
    expect(p.panelsBonded).toBe(6);
    expect(sharePct(s, p, DEMO.investor)).toBeCloseTo(0.2, 6);
    expect(projectStatus(p)).toBe("Bonding");
  });

  it("cannot over-bond a job", () => {
    const { state, projectId } = withJob();
    let s = faucet(state, DEMO.whale, 100_000, NOW);
    s = buyPanels(s, { buyer: DEMO.whale, count: 40, now: NOW }).state;
    expect(() => bondPanels(s, { holder: DEMO.whale, projectId, panels: 31, now: NOW })).toThrow(/needs only 30/);
  });

  it("cannot bond panels you do not hold", () => {
    const { state, projectId } = withJob();
    expect(() => bondPanels(state, { holder: DEMO.investor, projectId, panels: 1, now: NOW })).toThrow(/unbonded/);
  });
});

describe("takeout distribution", () => {
  function funded() {
    const { state, projectId } = withJob();
    let s = faucet(state, DEMO.whale, 100_000, NOW);
    s = buyPanels(s, { buyer: DEMO.investor, count: 6, now: NOW }).state;
    s = buyPanels(s, { buyer: DEMO.whale, count: 24, now: NOW }).state;
    s = bondPanels(s, { holder: DEMO.investor, projectId, panels: 6, now: NOW }).state;
    s = bondPanels(s, { holder: DEMO.whale, projectId, panels: 24, now: NOW }).state;
    return { s, projectId };
  }

  it("requires a fully bonded job before payments", () => {
    const { state, projectId } = withJob();
    expect(() => recordTakeoutPayment(state, { signer: DEMO.admin, projectId, kind: "rebate", amount: 100, memo: "x", now: NOW })).toThrow(/not fully bonded/);
  });

  it("pays rebate + REC pro-rata and lets holders claim", () => {
    const { s: f, projectId } = funded();
    let s = recordTakeoutPayment(f, { signer: DEMO.admin, projectId, kind: "rebate", amount: 3_600, memo: "rebate", now: NOW });
    s = recordTakeoutPayment(s, { signer: DEMO.admin, projectId, kind: "rec", amount: 8_926, memo: "first REC", now: NOW });
    const p = s.projects[0]!;
    expect(p.gate).toBe(6);
    expect(claimable(s, p, DEMO.investor)).toBeCloseTo((3_600 + 8_926) * 0.2, 4);
    const before = s.balances[DEMO.investor] ?? 0;
    const r = claim(s, { holder: DEMO.investor, projectId, now: NOW });
    expect(r.amount).toBeCloseTo((3_600 + 8_926) * 0.2, 4);
    expect(r.state.balances[DEMO.investor]).toBeCloseTo(before + r.amount, 4);
    expect(() => claim(r.state, { holder: DEMO.investor, projectId, now: NOW })).toThrow(/nothing claimable/i);
  });

  it("splits the REC tail 80/20 with the originator", () => {
    const { s: f, projectId } = funded();
    const s = recordTakeoutPayment(f, { signer: DEMO.admin, projectId, kind: "tail", amount: 1_000, memo: "tail q1", now: NOW });
    const p = s.projects[0]!;
    expect(p.payouts[0]!.toShares).toBe(800);
    expect(p.payouts[0]!.toOriginator).toBe(200);
    expect(p.originatorEarned).toBe(200);
  });

  it("is admin-only", () => {
    const { s: f, projectId } = funded();
    expect(() => recordTakeoutPayment(f, { signer: DEMO.investor, projectId, kind: "rebate", amount: 1, memo: "x", now: NOW })).toThrow(/admin-only/);
  });
});

describe("seed", () => {
  const s = seedState(NOW);

  it("stocks 500 panels less the seeded mints", () => {
    expect(s.panelsMinted).toBe(120);
    expect(s.shopStock).toBe(500 - 120);
  });

  it("leaves Springfield at 17/30 bonded with the demo wallet holding 4 shares and 8 loose panels", () => {
    const sp = s.projects.find((p) => p.name.startsWith("Prairie Ave"))!;
    expect(sp.panelsBonded).toBe(17);
    expect(sp.panelsRequired).toBe(30);
    expect(s.panels[DEMO.investor]).toBe(8);
    expect(sharePct(s, sp, DEMO.investor)).toBeCloseTo(4 / 30, 6);
  });

  it("has one fully funded job awaiting PTO and one paid-out job with a claim", () => {
    const decatur = s.projects.find((p) => p.name.startsWith("Maple St"))!;
    expect(projectStatus(decatur)).toBe("Funded");
    const charleston = s.projects.find((p) => p.name.startsWith("Lincoln Trail"))!;
    expect(projectStatus(charleston)).toBe("Paying");
    expect(claimable(s, charleston, DEMO.investor)).toBeGreaterThan(1_000);
  });
});
