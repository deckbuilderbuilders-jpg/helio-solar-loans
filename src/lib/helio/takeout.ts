/**
 * HELIO takeout engine.
 * Computes the contracted cash a lender bids against for one Illinois solar project:
 *   takeout = Ameren solar rebate + Ameren battery rebate + first REC payment
 *           − 5% REC-contract collateral lock − 3% protocol haircut reserve
 *   lendable = takeout × LTV cap(gate)
 */
import {
  AMEREN_BATTERY_REBATE_PER_KWH,
  AMEREN_SOLAR_REBATE_PER_KW_DC,
  ANNUAL_DEGRADATION,
  CAPACITY_FACTOR,
  CUSTOMER_OWNED_ADDER,
  EEC_ADDER,
  GROUP_A_DG_REC_PRICES,
  HOURS_PER_YEAR,
  INSTALL_COST_PER_WATT_DC,
  LARGE_DG_FIRST_PAYMENT_PCT,
  PROTOCOL_HAIRCUT_PCT,
  REC_COLLATERAL_PCT,
  REC_TERM_YEARS,
  SECONDS_PER_YEAR,
  SMALL_DG_FIRST_PAYMENT_PCT,
  SMALL_DG_MAX_KW_AC,
} from "./constants";

export interface ProjectSpecs {
  kwAc: number;
  kwDc: number;
  batteryKwh: number;
  customerOwned: boolean;
  eec: boolean;
}

export interface TakeoutBreakdown {
  specs: ProjectSpecs;
  installCost: number;
  /** REC price tier */
  tierLabel: string;
  basePrice: number;
  customerOwnedAdder: number;
  eecAdder: number;
  effectivePrice: number;
  /** REC quantities */
  year1Recs: number;
  totalRecsExact: number;
  totalRecs: number;
  recPurchaseAmount: number;
  isSmallDg: boolean;
  firstPaymentPct: number;
  firstRecPayment: number;
  recTail: number;
  /** Ameren */
  amerenSolarRebate: number;
  amerenBatteryRebate: number;
  /** Deductions */
  recCollateralLock: number;
  grossTakeout: number;
  protocolReserve: number;
  takeout: number;
}

export function recPriceTier(kwAc: number): { price: number; label: string } {
  const tier = GROUP_A_DG_REC_PRICES.find((t) => kwAc <= t.maxKwAc);
  if (!tier) {
    throw new Error(`Project of ${kwAc} kW AC exceeds the 5,000 kW AC Distributed Generation cap.`);
  }
  return { price: tier.price, label: tier.label };
}

/**
 * ABP REC quantity: year1 = kW_ac × CF × 8.760; total = Σ_{t=0..14} year1 × 0.995^t,
 * displayed rounded down to whole RECs.
 */
export function recQuantities(kwAc: number): { year1: number; totalExact: number; total: number } {
  const year1 = kwAc * CAPACITY_FACTOR * (HOURS_PER_YEAR / 1000);
  let totalExact = 0;
  for (let t = 0; t < REC_TERM_YEARS; t++) {
    totalExact += year1 * Math.pow(1 - ANNUAL_DEGRADATION, t);
  }
  return { year1, totalExact, total: Math.floor(totalExact) };
}

export function computeTakeout(specs: ProjectSpecs): TakeoutBreakdown {
  if (specs.kwAc <= 0 || specs.kwDc <= 0) {
    throw new Error("kW AC and kW DC must both be positive.");
  }
  if (specs.batteryKwh < 0) {
    throw new Error("Battery kWh cannot be negative.");
  }

  const installCost = specs.kwDc * 1000 * INSTALL_COST_PER_WATT_DC;
  const tier = recPriceTier(specs.kwAc);
  const isSmallDg = specs.kwAc <= SMALL_DG_MAX_KW_AC;
  // Small DG adders only apply to Small DG per program rules.
  const customerOwnedAdder = specs.customerOwned && isSmallDg ? CUSTOMER_OWNED_ADDER : 0;
  const eecAdder = specs.eec ? EEC_ADDER : 0;
  const effectivePrice = tier.price + customerOwnedAdder + eecAdder;

  const q = recQuantities(specs.kwAc);
  const recPurchaseAmount = q.total * effectivePrice;
  const firstPaymentPct = isSmallDg ? SMALL_DG_FIRST_PAYMENT_PCT : LARGE_DG_FIRST_PAYMENT_PCT;
  const firstRecPayment = recPurchaseAmount * firstPaymentPct;
  const recTail = recPurchaseAmount - firstRecPayment;

  const amerenSolarRebate = specs.kwDc * AMEREN_SOLAR_REBATE_PER_KW_DC;
  // Battery rebate only when paired with qualifying solar (kwDc > 0 is guaranteed above).
  const amerenBatteryRebate = specs.batteryKwh * AMEREN_BATTERY_REBATE_PER_KWH;

  const recCollateralLock = recPurchaseAmount * REC_COLLATERAL_PCT;
  const grossTakeout = amerenSolarRebate + amerenBatteryRebate + firstRecPayment - recCollateralLock;
  const protocolReserve = grossTakeout * PROTOCOL_HAIRCUT_PCT;
  const takeout = grossTakeout - protocolReserve;

  return {
    specs,
    installCost,
    tierLabel: tier.label,
    basePrice: tier.price,
    customerOwnedAdder,
    eecAdder,
    effectivePrice,
    year1Recs: q.year1,
    totalRecsExact: q.totalExact,
    totalRecs: q.total,
    recPurchaseAmount,
    isSmallDg,
    firstPaymentPct,
    firstRecPayment,
    recTail,
    amerenSolarRebate,
    amerenBatteryRebate,
    recCollateralLock,
    grossTakeout,
    protocolReserve,
    takeout,
  };
}

export function lendable(takeout: number, ltvBps: number): number {
  return (takeout * ltvBps) / 10_000;
}

/** Interest = principal × apy_bps × elapsed_seconds / (10_000 × 365 × 86400). Mirrors the on-chain formula. */
export function interestFor(principal: number, apyBps: number, elapsedSeconds: number): number {
  return (principal * apyBps * elapsedSeconds) / (10_000 * SECONDS_PER_YEAR);
}

/** Same formula in u64 micro-USDC, exactly as the Anchor program computes it. */
export function interestMicro(principalMicro: bigint, apyBps: bigint, elapsedSeconds: bigint): bigint {
  return (principalMicro * apyBps * elapsedSeconds) / (10_000n * BigInt(SECONDS_PER_YEAR));
}

export function toMicro(usdc: number): bigint {
  return BigInt(Math.round(usdc * 1_000_000));
}
export function fromMicro(micro: bigint): number {
  return Number(micro) / 1_000_000;
}

export interface LoanQuote {
  principal: number;
  termDays: number;
  apyBps: number;
  originationBps: number;
  origination: number;
  interest: number;
  protocolCut: number;
  lenderNetInterest: number;
  repayTotal: number;
  borrowerNetAtOrigination: number;
  borrowerResidualAfterTakeout: number;
  /** Simple yield per turn and annualised for the lender */
  turnYieldPct: number;
  lenderNetApyPct: number;
}

export function quoteLoan(
  takeout: number,
  opts: { ltvBps: number; termDays: number; apyBps: number; originationBps: number; protocolFeeBps: number },
): LoanQuote {
  const principal = lendable(takeout, opts.ltvBps);
  const interest = interestFor(principal, opts.apyBps, opts.termDays * 86400);
  const origination = (principal * opts.originationBps) / 10_000;
  const protocolCut = (interest * opts.protocolFeeBps) / 10_000;
  const lenderNetInterest = interest - protocolCut;
  const repayTotal = principal + interest;
  return {
    principal,
    termDays: opts.termDays,
    apyBps: opts.apyBps,
    originationBps: opts.originationBps,
    origination,
    interest,
    protocolCut,
    lenderNetInterest,
    repayTotal,
    borrowerNetAtOrigination: principal - origination,
    borrowerResidualAfterTakeout: takeout - repayTotal - origination,
    turnYieldPct: (lenderNetInterest / principal) * 100,
    lenderNetApyPct: (opts.apyBps / 100) * (1 - opts.protocolFeeBps / 10_000),
  };
}

/** Flagship seeded project: 10 kW AC / 12 kW DC, customer-owned, EEC, no battery. */
export const FLAGSHIP_SPECS: ProjectSpecs = {
  kwAc: 10,
  kwDc: 12,
  batteryKwh: 0,
  customerOwned: true,
  eec: true,
};

/** Second seeded project: same array + 13.5 kWh battery. */
export const FLAGSHIP_ESS_SPECS: ProjectSpecs = { ...FLAGSHIP_SPECS, batteryKwh: 13.5 };
