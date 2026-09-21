/**
 * Seed — leaves the demo ready on first click:
 * 500 panels in the shop, one bonding job (17/30), one fully funded job awaiting PTO,
 * one paid-out job, and a demo wallet holding 8 unbonded panels + 4 shares on Springfield.
 */
import { ORIGINATOR_TAIL_BPS } from "./constants";
import { bondPanels, buyPanels, faucet, originateProject, recordTakeoutPayment } from "./ledger";
import type { HelioProject, LedgerState } from "./types";

export const DEMO = {
  admin: "HeLioAdm1nORACLEmi1estoneWr1terDevnet1111111",
  treasury: "HeLioTreasuryOr1ginatorVau1tDevnet1111111111",
  usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  panelMint: "PANEL400WHeLioToken2022MintDevnet9999999999",
  investor: "INVdemoPane1Ho1derDevnet55555555555555555555",
  whale: "WHALEdemoPane1StackDevnet7777777777777777777",
  retail: "RETAILdemoPane1BuyerDevnet3333333333333333333",
} as const;

export function emptyState(): LedgerState {
  return {
    config: {
      admin: DEMO.admin,
      treasury: DEMO.treasury,
      usdcMint: DEMO.usdcMint,
      panelMint: DEMO.panelMint,
      originatorTailBps: ORIGINATOR_TAIL_BPS,
    },
    shopStock: 500,
    panelsMinted: 0,
    panelsBurned: 0,
    balances: {},
    panels: {},
    projects: [],
    bonds: [],
    log: [],
    counter: 0,
  };
}

const D = 86400;

export function seedState(now: number): LedgerState {
  let s = emptyState();
  const t0 = now - 120 * D;

  s = faucet(s, DEMO.investor, 12_000, t0);
  s = faucet(s, DEMO.whale, 120_000, t0);
  s = faucet(s, DEMO.retail, 8_000, t0);

  const originate = (a: Parameters<typeof originateProject>[2]): HelioProject => {
    const r = originateProject(s, DEMO.admin, a);
    s = r.state;
    return r.project;
  };
  const buy = (who: string, n: number, at: number) => {
    s = buyPanels(s, { buyer: who, count: n, now: at }).state;
  };
  const bond = (who: string, projectId: string, n: number, at: number) => {
    s = bondPanels(s, { holder: who, projectId, panels: n, now: at }).state;
  };

  // ── Job 1 — the featured bonding job: 10 kW AC / 12 kW-DC, customer-owned, EEC ──
  const springfield = originate({
    name: "Prairie Ave — Springfield",
    city: "Springfield, IL",
    address: "1418 Prairie Ave, Springfield, IL 62704",
    rateClass: "DS-1",
    specs: { kwAc: 10, kwDc: 12, batteryKwh: 0, customerOwned: true, eec: true },
    tradeDate: now - 70 * D,
    gate: 2,
    now: now - 70 * D,
  });

  // ── Job 2 — fully funded, awaiting PTO: 8 kW AC / 9.6 kW-DC → 24 panels ──
  const decatur = originate({
    name: "Maple St — Decatur",
    city: "Decatur, IL",
    address: "845 W Maple St, Decatur, IL 62522",
    rateClass: "DS-1",
    specs: { kwAc: 8, kwDc: 9.6, batteryKwh: 0, customerOwned: true, eec: true },
    tradeDate: now - 110 * D,
    gate: 2,
    now: now - 110 * D,
  });

  // ── Job 3 — paid out: 10 kW AC / 12 kW-DC + 13.5 kWh battery ──
  const charleston = originate({
    name: "Lincoln Trail — Charleston",
    city: "Charleston, IL",
    address: "310 Lincoln Trail Dr, Charleston, IL 61920",
    rateClass: "DS-1",
    specs: { kwAc: 10, kwDc: 12, batteryKwh: 13.5, customerOwned: true, eec: true },
    tradeDate: now - 200 * D,
    gate: 2,
    now: now - 200 * D,
  });

  // ── Job 4 — a bigger commercial job, early bonding ──
  const pana = originate({
    name: "Route 51 Ag Barn — Pana",
    city: "Pana, IL",
    address: "2260 IL-51, Pana, IL 62557",
    rateClass: "DS-2",
    specs: { kwAc: 20, kwDc: 24, batteryKwh: 0, customerOwned: true, eec: false },
    tradeDate: now - 40 * D,
    gate: 2,
    now: now - 40 * D,
  });

  // ── Panel mints ──
  buy(DEMO.investor, 18, now - 60 * D); // 4 bonded on Springfield + 6 on Charleston + 8 left unbonded
  buy(DEMO.whale, 90, now - 100 * D);
  buy(DEMO.retail, 18, now - 90 * D);

  // Springfield: 17 / 30 bonded
  bond(DEMO.investor, springfield.id, 4, now - 58 * D);
  bond(DEMO.whale, springfield.id, 10, now - 50 * D);
  bond(DEMO.retail, springfield.id, 3, now - 44 * D);

  // Decatur: fully funded (24 panels), awaiting PTO
  bond(DEMO.whale, decatur.id, 20, now - 95 * D);
  bond(DEMO.retail, decatur.id, 4, now - 92 * D);

  // Charleston: fully funded (30 panels) then paid out
  bond(DEMO.whale, charleston.id, 24, now - 180 * D);
  bond(DEMO.investor, charleston.id, 6, now - 178 * D);

  // Pana: 9 / 60 bonded
  bond(DEMO.whale, pana.id, 9, now - 30 * D);

  // ── Charleston milestones + takeout payments ──
  const c = s.projects.find((p) => p.id === charleston.id)!;
  s = { ...s, projects: s.projects.map((p) => (p.id === c.id ? { ...p, gate: 3 } : p)) };
  s = recordTakeoutPayment(s, {
    signer: DEMO.admin,
    projectId: c.id,
    kind: "rebate",
    amount: c.takeout.amerenSolarRebate + c.takeout.amerenBatteryRebate,
    memo: "Ameren DS-1 smart-inverter rebate — 12 kW-DC × $300 + 13.5 kWh × $300",
    now: now - 90 * D,
  });
  s = recordTakeoutPayment(s, {
    signer: DEMO.admin,
    projectId: c.id,
    kind: "rec",
    amount: c.takeout.firstRecPayment - c.takeout.recCollateralLock,
    memo: "Illinois Shines Part II — 50% REC purchase amount net of 5% collateral lock",
    now: now - 40 * D,
  });
  s = recordTakeoutPayment(s, {
    signer: DEMO.admin,
    projectId: c.id,
    kind: "tail",
    amount: c.takeout.recTail / 24,
    memo: "REC tail quarter 1 of 24 — 80% to shares, 20% originator",
    now: now - 10 * D,
  });

  // Decatur energized (PTO filed) but rebate not yet in
  s = { ...s, projects: s.projects.map((p) => (p.id === decatur.id ? { ...p, gate: 2 } : p)) };

  return s;
}
