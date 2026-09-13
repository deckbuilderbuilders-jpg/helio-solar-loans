/**
 * `pnpm seed` equivalent — builds the demo-ready ledger the judges click through.
 * Deterministic: every seeded action is replayed through the same instructions the UI uses.
 */
import { PROTOCOL_FEE_BPS } from "./constants";
import {
  acceptOffer,
  faucet,
  listProject,
  postOffer,
  recordTakeoutPayment,
  repay,
} from "./ledger";
import { FLAGSHIP_ESS_SPECS, FLAGSHIP_SPECS } from "./takeout";
import type { Collection, LedgerState } from "./types";

export const DEMO = {
  admin: "HeLioAdm1nORACLEmi1estoneWr1terDevnet1111111",
  treasury: "HeLioTreasuryFeeVau1tDevnet11111111111111111",
  usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  lender: "LNDRdemoUSDCcreditFundDevnet4444444444444444",
  av: "AVdemoI11inoisApprovedVendorDevnet7777777777",
  lender2: "LNDR2kaminoRefugeeDevnet33333333333333333333",
  lender3: "LNDR3mapleAlumniDevnet2222222222222222222222",
} as const;

export const COLLECTIONS: Collection[] = [
  {
    slug: "A-SDG-10",
    name: "Ameren Small DG 0–10 kW",
    description: "Group A, 0–10 kW AC, no battery. $70.37/REC base, 50% REC payment at Part II.",
    gateMin: 2,
    ltvBps: 8800,
    defaultApyBps: 2400,
    termSeconds: 60 * 86400,
    minKwAc: 0,
    maxKwAc: 10,
    requiresBattery: false,
  },
  {
    slug: "A-SDG-10-ESS",
    name: "Ameren Small DG 0–10 kW + Storage",
    description: "Same array plus paired battery. Adds $300/kWh Ameren battery rebate to takeout.",
    gateMin: 2,
    ltvBps: 8800,
    defaultApyBps: 2400,
    termSeconds: 60 * 86400,
    minKwAc: 0,
    maxKwAc: 10,
    requiresBattery: true,
  },
  {
    slug: "A-SDG-25",
    name: "Ameren Small DG 10–25 kW",
    description: "Group A, >10–25 kW AC. $60.92/REC base, still 50% up-front Small DG.",
    gateMin: 2,
    ltvBps: 8800,
    defaultApyBps: 2400,
    termSeconds: 60 * 86400,
    minKwAc: 10,
    maxKwAc: 25,
    requiresBattery: null,
  },
  {
    slug: "A-LDG",
    name: "Ameren Large DG >25 kW",
    description: "Large DG pays only 15% of REC contract up front → lower LTV, higher coupon.",
    gateMin: 2,
    ltvBps: 7000,
    defaultApyBps: 2800,
    termSeconds: 90 * 86400,
    minKwAc: 25,
    maxKwAc: 5000,
    requiresBattery: null,
  },
];

export function emptyState(): LedgerState {
  return {
    config: {
      admin: DEMO.admin,
      treasury: DEMO.treasury,
      usdcMint: DEMO.usdcMint,
      protocolFeeBps: PROTOCOL_FEE_BPS,
      treasuryBalance: 0,
    },
    balances: {},
    collections: COLLECTIONS,
    offers: [],
    projects: [],
    loans: [],
    log: [],
    counter: 0,
  };
}

const D = 86400;

export function seedState(now: number): LedgerState {
  let s = emptyState();
  const t0 = now - 90 * D;

  // Faucet demo wallets
  s = faucet(s, DEMO.lender, 60_000, t0);
  s = faucet(s, DEMO.lender2, 40_000, t0);
  s = faucet(s, DEMO.lender3, 40_000, t0);
  s = faucet(s, DEMO.av, 2_500, t0);

  // ── Projects (all borrowed by the demo Approved Vendor) ──
  const p = (args: Parameters<typeof listProject>[1]) => {
    const r = listProject(s, args);
    s = r.state;
    return r.project;
  };

  // Fully repaid history loan: 9 kW AC, repaid 15 days ago
  const repaid = p({
    borrower: DEMO.av,
    name: "Prairie Ave — Springfield",
    address: "1418 Prairie Ave, Springfield, IL 62704",
    rateClass: "DS-1",
    specs: { kwAc: 9, kwDc: 10.8, batteryKwh: 0, customerOwned: true, eec: true },
    gate: 3,
    tradeDate: now - 200 * D,
    now: t0,
  });
  // Defaulted loan on a 20 kW project, expired 6 days ago (> 72h grace) → foreclosable
  const defaulted = p({
    borrower: DEMO.av,
    name: "Route 51 Ag Barn — Pana",
    address: "2260 IL-51, Pana, IL 62557",
    rateClass: "DS-2",
    specs: { kwAc: 20, kwDc: 24, batteryKwh: 0, customerOwned: true, eec: false },
    gate: 3,
    tradeDate: now - 160 * D,
    now: t0 + D,
  });
  // Flagship, currently borrowed at G3 (started 20 days ago)
  const flagship = p({
    borrower: DEMO.av,
    name: "Maple St — Decatur (flagship)",
    address: "845 W Maple St, Decatur, IL 62522",
    rateClass: "DS-1",
    specs: FLAGSHIP_SPECS,
    gate: 3,
    tradeDate: now - 120 * D,
    now: t0 + 2 * D,
  });
  // G4 with rebate already in escrow (started 25 days ago, 30-day G4 book)
  const g4 = p({
    borrower: DEMO.av,
    name: "Lincoln Trail — Charleston",
    address: "310 Lincoln Trail Dr, Charleston, IL 61920",
    rateClass: "DS-1",
    specs: { kwAc: 8, kwDc: 9.6, batteryKwh: 0, customerOwned: true, eec: true },
    gate: 4,
    tradeDate: now - 150 * D,
    now: t0 + 3 * D,
  });
  // G2 waiting (battery), no loan yet
  p({
    borrower: DEMO.av,
    name: "Fairview Park — Decatur (+ESS)",
    address: "1220 W Fairview Ave, Decatur, IL 62522",
    rateClass: "DS-1",
    specs: FLAGSHIP_ESS_SPECS,
    gate: 2,
    tradeDate: now - 30 * D,
    now: t0 + 4 * D,
  });
  // G3 ready-to-borrow flagship twin — the click-path project
  p({
    borrower: DEMO.av,
    name: "Oakland Ave — Decatur",
    address: "2010 N Oakland Ave, Decatur, IL 62526",
    rateClass: "DS-1",
    specs: FLAGSHIP_SPECS,
    gate: 3,
    tradeDate: now - 100 * D,
    now: t0 + 5 * D,
  });

  // ── Historical loans ──
  // Repaid path: lender2 lent 9,000 on the 9 kW at G3, takeout came in, waterfall ran.
  {
    const o = postOffer(s, { lender: DEMO.lender2, collection: "A-SDG-10", principal: 8_500, apyBps: 2400, originationBps: 150, termSeconds: 60 * D, minGate: 3, now: now - 70 * D });
    s = o.state;
    const l = acceptOffer(s, { borrower: DEMO.av, offerId: o.offer.id, projectId: repaid.id, now: now - 70 * D });
    s = l.state;
    s = recordTakeoutPayment(s, { signer: DEMO.admin, loanId: l.loan.id, kind: "rebate", amount: 3_240, memo: "Ameren DS-1 smart-inverter rebate, 10.8 kW-DC × $300", now: now - 20 * D });
    s = recordTakeoutPayment(s, { signer: DEMO.admin, loanId: l.loan.id, kind: "rec", amount: repaid.takeout.firstRecPayment - repaid.takeout.recCollateralLock, memo: "Illinois Shines Part II — 50% REC purchase amount net of 5% collateral", now: now - 15 * D });
    s = repay(s, { signer: DEMO.av, loanId: l.loan.id, walletAmount: 0, now: now - 15 * D }).state;
  }
  // Defaulted path: demo lender lent on the 20 kW, term ended 6 days ago, nothing repaid.
  {
    const o = postOffer(s, { lender: DEMO.lender, collection: "A-SDG-25", principal: 12_000, apyBps: 2400, originationBps: 150, termSeconds: 60 * D, minGate: 3, now: now - 66 * D });
    s = o.state;
    s = acceptOffer(s, { borrower: DEMO.av, offerId: o.offer.id, projectId: defaulted.id, now: now - 66 * D }).state;
  }
  // Flagship live loan: lender3 lent 9,700 at 24% / 60d, 20 days in.
  {
    const o = postOffer(s, { lender: DEMO.lender3, collection: "A-SDG-10", principal: 9_700, apyBps: 2400, originationBps: 150, termSeconds: 60 * D, minGate: 3, now: now - 20 * D });
    s = o.state;
    s = acceptOffer(s, { borrower: DEMO.av, offerId: o.offer.id, projectId: flagship.id, now: now - 20 * D }).state;
  }
  // G4 live loan with rebate already in escrow: demo lender lent 7,500 at 18% / 30d, 25 days in.
  {
    const o = postOffer(s, { lender: DEMO.lender, collection: "A-SDG-10", principal: 7_500, apyBps: 1800, originationBps: 100, termSeconds: 30 * D, minGate: 4, now: now - 25 * D });
    s = o.state;
    const l = acceptOffer(s, { borrower: DEMO.av, offerId: o.offer.id, projectId: g4.id, now: now - 25 * D });
    s = l.state;
    s = recordTakeoutPayment(s, { signer: DEMO.admin, loanId: l.loan.id, kind: "rebate", amount: 2_880, memo: "Ameren DS-1 smart-inverter rebate, 9.6 kW-DC × $300", now: now - 2 * D });
  }

  // ── Open order book: 8 offers across G3 24%/60d and G4 18%/30d ──
  const open = (lender: string, collection: string, principal: number, gate: 3 | 4, ago: number) => {
    const grid = gate === 3 ? { apy: 2400, orig: 150, term: 60 } : { apy: 1800, orig: 100, term: 30 };
    s = postOffer(s, { lender, collection, principal, apyBps: grid.apy, originationBps: grid.orig, termSeconds: grid.term * D, minGate: gate, now: now - ago * D }).state;
  };
  open(DEMO.lender, "A-SDG-10", 9_720, 3, 3);
  open(DEMO.lender2, "A-SDG-10", 5_000, 3, 2);
  open(DEMO.lender3, "A-SDG-10", 2_500, 4, 1);
  open(DEMO.lender, "A-SDG-10-ESS", 12_800, 3, 4);
  open(DEMO.lender2, "A-SDG-10-ESS", 6_000, 4, 2);
  open(DEMO.lender3, "A-SDG-25", 15_000, 3, 5);
  open(DEMO.lender, "A-SDG-25", 8_000, 4, 1);
  open(DEMO.lender2, "A-LDG", 25_000, 3, 6);

  return s;
}
