import { createNote, faucet } from "./ledger";
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
    log: [],
    counter: 0,
  };
}

const D = 86400;

/**
 * One real project, from Illinois Shines Purchase Disclosure Form ID# 1172865 (2026-09-15):
 *   237 King St, White Hall, IL 62092 · Ameren Illinois (Group A) · residential, customer-owned
 *   16.00 kW AC / 26.91 kW DC · 96 kWh battery · CF 24.7% (HelioScope)
 *   Expected REC incentive $44,678.40 → 552 RECs at $80.92 ($60.92 bin + $20 customer-owned)
 *   Rebates: $8,073 solar ($300/kW-DC) + $28,800 storage ($300/kWh)
 *   Vendor: Prairie Guardians · Installer: Illinois Solar Contractors LLC
 */
export const WHITE_HALL = {
  name: "King St — White Hall",
  city: "White Hall, IL",
  address: "237 King St, White Hall, IL 62092",
  kwDc: 26.91,
  batteryKwh: 96,
  rec: {
    group: "A" as const,
    kwAc: 16,
    capacityFactor: 0.247,
    customerOwned: true,
    eec: false,
    partIQty: 552,
    partIIQty: null,
    programYear: "2026–27",
  },
};

export function seedState(now: number): LedgerState {
  let s = emptyState();
  const t0 = now - 1 * D;
  const fee = WHITE_HALL.kwDc * 20;
  s = faucet(s, DEMO.investor, fee, t0);
  s = createNote(s, DEMO.investor, {
    ...WHITE_HALL,
    application: { fileName: "ID1172865_20260915_1.pdf", fileHash: "", editedFields: [], importedAt: t0 },
    now: t0,
  }).state;
  return s;
}
