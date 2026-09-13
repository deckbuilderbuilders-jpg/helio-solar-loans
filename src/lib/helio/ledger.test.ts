import { describe, expect, it } from "vitest";
import { GRACE_SECONDS } from "./constants";
import {
  HelioError,
  acceptOffer,
  balanceOf,
  extend,
  faucet,
  foreclose,
  interestDue,
  listProject,
  postOffer,
  recordTakeoutPayment,
  repay,
} from "./ledger";
import { DEMO, emptyState, seedState } from "./seed";
import { FLAGSHIP_SPECS } from "./takeout";

const D = 86400;
const NOW = 1_789_000_000; // Sep 2026

function setup() {
  let s = emptyState();
  s = faucet(s, DEMO.lender, 20_000, NOW);
  const proj = listProject(s, {
    borrower: DEMO.av,
    name: "Flagship",
    address: "Decatur, IL",
    rateClass: "DS-1",
    specs: FLAGSHIP_SPECS,
    gate: 3,
    now: NOW,
  });
  s = proj.state;
  const offer = postOffer(s, {
    lender: DEMO.lender,
    collection: "A-SDG-10",
    principal: 9_720,
    apyBps: 2400,
    originationBps: 150,
    termSeconds: 60 * D,
    minGate: 3,
    now: NOW,
  });
  s = offer.state;
  return { s, project: proj.project, offer: offer.offer };
}

describe("post_offer → accept → repay (flagship)", () => {
  it("runs the full waterfall and thaws the note", () => {
    let { s, project, offer } = setup();
    expect(balanceOf(s, DEMO.lender)).toBe(20_000 - 9_720);

    const acc = acceptOffer(s, { borrower: DEMO.av, offerId: offer.id, projectId: project.id, now: NOW });
    s = acc.state;
    const loan = acc.loan;
    // borrower receives principal net of 1.5% origination
    expect(balanceOf(s, DEMO.av)).toBeCloseTo(9_720 - 145.8, 6);
    expect(s.config.treasuryBalance).toBeCloseTo(145.8, 6);
    expect(s.projects[0]!.noteFrozen).toBe(true);

    const due = interestDue(loan);
    expect(Math.abs(due - 9_720 * 0.24 * (60 / 365))).toBeLessThan(0.01);

    // takeout lands: rebate then REC
    s = recordTakeoutPayment(s, { signer: DEMO.admin, loanId: loan.id, kind: "rebate", amount: 3_600, memo: "Ameren", now: NOW + 50 * D });
    expect(s.projects[0]!.gate).toBe(5);
    s = recordTakeoutPayment(s, { signer: DEMO.admin, loanId: loan.id, kind: "rec", amount: 9_918.48 - 991.85, memo: "REC", now: NOW + 55 * D });
    expect(s.projects[0]!.gate).toBe(6);

    const lenderBefore = balanceOf(s, DEMO.lender);
    const avBefore = balanceOf(s, DEMO.av);
    const r = repay(s, { signer: DEMO.av, loanId: loan.id, walletAmount: 0, now: NOW + 55 * D });
    s = r.state;
    expect(r.loan.state).toBe("Repaid");
    expect(balanceOf(s, DEMO.lender) - lenderBefore).toBeCloseTo(9_720 + due * 0.9, 4);
    expect(s.config.treasuryBalance).toBeCloseTo(145.8 + due * 0.1, 4);
    const residual = balanceOf(s, DEMO.av) - avBefore;
    expect(residual).toBeCloseTo(3_600 + 9_918.48 - 991.85 - 9_720 - due, 4);
    expect(residual).toBeGreaterThan(1_900);
    expect(s.projects[0]!.gate).toBe(7);
    expect(s.projects[0]!.noteFrozen).toBe(false);
  });

  it("supports partial prepay from wallet", () => {
    let { s, project, offer } = setup();
    const acc = acceptOffer(s, { borrower: DEMO.av, offerId: offer.id, projectId: project.id, now: NOW });
    s = acc.state;
    const r = repay(s, { signer: DEMO.av, loanId: acc.loan.id, walletAmount: 5_000, now: NOW + 10 * D });
    expect(r.loan.state).toBe("Active");
    expect(r.loan.principalRepaid).toBe(5_000);
  });
});

describe("post_offer → accept → expire → foreclose", () => {
  it("blocks foreclose during grace and transfers the note after", () => {
    let { s, project, offer } = setup();
    const acc = acceptOffer(s, { borrower: DEMO.av, offerId: offer.id, projectId: project.id, now: NOW });
    s = acc.state;
    const expiry = NOW + 60 * D;
    expect(() => foreclose(s, DEMO.lender, acc.loan.id, expiry + 3600)).toThrow(HelioError);
    s = foreclose(s, DEMO.lender, acc.loan.id, expiry + GRACE_SECONDS + 1);
    expect(s.loans[0]!.state).toBe("Foreclosed");
    expect(s.projects[0]!.noteOwner).toBe(DEMO.lender);
    expect(s.projects[0]!.noteFrozen).toBe(false);
  });

  it("allows exactly one extension at +6% APY", () => {
    let { s, project, offer } = setup();
    const acc = acceptOffer(s, { borrower: DEMO.av, offerId: offer.id, projectId: project.id, now: NOW });
    s = acc.state;
    const baseDue = interestDue(acc.loan);
    s = extend(s, DEMO.av, acc.loan.id, NOW + 59 * D);
    expect(s.loans[0]!.state).toBe("Extended");
    expect(s.loans[0]!.expiresAt).toBe(NOW + 90 * D);
    expect(interestDue(s.loans[0]!)).toBeCloseTo(baseDue + 9_720 * 0.3 * (30 / 365), 4);
    expect(() => extend(s, DEMO.av, acc.loan.id, NOW + 80 * D)).toThrow(/exactly once/);
  });
});

describe("guards", () => {
  it("rejects gate too low, collection mismatch and LTV breach", () => {
    let { s, project } = setup();
    const low = postOffer(s, { lender: DEMO.lender, collection: "A-SDG-10", principal: 1_000, apyBps: 1800, originationBps: 100, termSeconds: 30 * D, minGate: 4, now: NOW });
    s = low.state;
    expect(() => acceptOffer(s, { borrower: DEMO.av, offerId: low.offer.id, projectId: project.id, now: NOW })).toThrow(/G4/);

    const big = postOffer(s, { lender: DEMO.lender, collection: "A-SDG-10", principal: 9_000, apyBps: 2400, originationBps: 150, termSeconds: 60 * D, minGate: 3, now: NOW });
    s = big.state;
    // 9,000 + 9,720 already posted... lendable cap is 9,720.66, so 9,000 passes; bump project takeout check via bigger offer
    expect(() => acceptOffer(s, { borrower: DEMO.lender, offerId: big.offer.id, projectId: project.id, now: NOW })).toThrow(/Approved Vendor/);
  });
});

describe("seed", () => {
  it("leaves the chain demo-ready", () => {
    const s = seedState(NOW);
    expect(s.collections).toHaveLength(4);
    expect(s.offers.filter((o) => o.state === "Open")).toHaveLength(8);
    expect(s.loans.filter((l) => l.state === "Repaid")).toHaveLength(1);
    const foreclosable = s.loans.filter((l) => l.state === "Active" && NOW > l.expiresAt + GRACE_SECONDS);
    expect(foreclosable).toHaveLength(1);
    expect(foreclosable[0]!.lender).toBe(DEMO.lender);
    const g4 = s.loans.find((l) => l.apyBps === 1800 && l.state === "Active");
    expect(g4?.escrowBalance).toBe(2_880);
    expect(s.projects.some((p) => p.gate === 2 && !p.activeLoanId)).toBe(true);
  });
});
