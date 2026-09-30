/**
 * HELIO full-stack economics.
 *
 * A HELIO project is a customer power-purchase agreement on an Illinois roof:
 * solar + storage at zero cost, a 50% smaller power bill, title to the customer
 * (customer-owned REC adder).
 *
 * Capital stack, per roof:
 *   1. Creator pays the $20/kW application fee. 100% at risk.
 *   2. Lenders fund the build at a fixed APR set from the roof's REC value (18–24%).
 *   3. Day 90–120: Ameren rebates + first Illinois Shines REC payment land, and
 *      HELIO factors (sells) the remaining REC contract at 65% of face.
 *   4. Waterfall: lenders P+I → creator 5x cash → installer 7% of factor → HELIO.
 */
import { recContract, defaultRecInputs, type RecContract, type RecInputs } from "./rec";

/* ---------------------------------- Build --------------------------------- */

export const SOLAR_HARDWARE_PER_W_DC = 0.8;
export const INSTALLER_BASE_PER_W_DC = 0.33;
/** Paid only when the crew finishes the install in one day. */
export const INSTALLER_DAY_ONE_BONUS_PER_W_DC = 0.02;
export const INSTALLER_LABOR_PER_W_DC = INSTALLER_BASE_PER_W_DC + INSTALLER_DAY_ONE_BONUS_PER_W_DC;
export const SOLAR_COST_PER_W_DC = SOLAR_HARDWARE_PER_W_DC + INSTALLER_LABOR_PER_W_DC; // 1.15

export const BATTERY_HARDWARE_PER_KWH = 225;
export const BATTERY_INSTALL_PER_KWH = 25;
export const BATTERY_COST_PER_KWH = BATTERY_HARDWARE_PER_KWH + BATTERY_INSTALL_PER_KWH; // 250
/** Standard pairing: 64 kWh on a 10 kW-DC roof. */
export const BATTERY_KWH_PER_KW_DC = 6.4;

/* ------------------------------- Fixed rebates ----------------------------- */

/** Ameren DG rebate, $300/kW-DC — fixed per kW installed. */
export const AMEREN_SOLAR_REBATE_PER_KW_DC = 300;
/** Ameren paired-storage rebate, $300/kWh. */
export const BATTERY_REBATE_PER_KWH = 300;

/* -------------------------------- Factoring -------------------------------- */

/** Remaining REC contract is sold for 65% of face at energization. */
export const FACTOR_ADVANCE = 0.65;

/* ------------------------------ Lender pricing ----------------------------- */

export const APR_MIN = 0.18;
export const APR_MAX = 0.24;
/** Coverage at or above this prices at APR_MIN. */
export const COVERAGE_FULL = 1.3;
/** Below this the oracle refuses to list the roof. */
export const COVERAGE_MIN = 1.12;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Thinner REC cushion → riskier loan → higher APR. Linear 24% @1.12x → 18% @1.30x. */
export function aprForCoverage(coverage: number): number {
  const c = clamp(coverage, COVERAGE_MIN, COVERAGE_FULL);
  return APR_MAX - ((c - COVERAGE_MIN) / (COVERAGE_FULL - COVERAGE_MIN)) * (APR_MAX - APR_MIN);
}

/* --------------------------- Application / creation ----------------------- */

export const APPLICATION_FEE_PER_KW = 20;
/** Creator reward: 3x + 2x, both cash at takeout (5x total). */
export const CREATOR_CASH_MULTIPLE = 3;
export const CREATOR_BONUS_CASH_MULTIPLE = 2;
export const CREATOR_TOTAL_MULTIPLE = CREATOR_CASH_MULTIPLE + CREATOR_BONUS_CASH_MULTIPLE;

/** Installer share of factored REC proceeds (20% of HELIO's 35% fee). */
export const FACTOR_TO_INSTALLER = 0.07;

export const PREBOND_EXIT_FEE = 0.025;
export const PREBOND_EXIT_TO_STAYERS = 0.015;
export const PREBOND_EXIT_TO_PROTOCOL = 0.01;

/* ------------------------------ Customer PPA ------------------------------ */

export const CUSTOMER_BILL_REDUCTION = 0.5;
/** Customer PPA payment, 100% to HELIO for maintenance. Per kW-DC per month. */
export const PPA_PER_KW_DC_MONTH = 9;
export const PPA_TERM_YEARS = 15;

/* -------------------------------- Modelling ------------------------------- */

export interface ProjectEconomics {
  kwDc: number;
  wattsDc: number;
  batteryKwh: number;
  recInputs: RecInputs;
  rec: RecContract;
  solarCost: number;
  batteryCost: number;
  installerBase: number;
  installerDayOneBonus: number;
  buildCost: number;
  applicationFee: number;
  amerenSolarRebate: number;
  amerenBatteryRebate: number;
  firstRecPayment: number;
  grossTakeout: number;
  recContractTotal: number;
  recCollateral: number;
  /** Rebates + first REC − collateral: what lands from the utility + program. */
  takeout: number;
  factorFace: number;
  factorProceeds: number;
  /** takeout + factorProceeds. */
  totalCash: number;
  coverage: number;
  /** Alias kept for cards. */
  takeoutCoverage: number;
  apr: number;
  listable: boolean;
  creatorCashBack: number;
  creatorBonusCash: number;
  creatorTotal: number;
  installerFactorShare: number;
  ppaMonthly: number;
  ppaAnnual: number;
}

export function batteryForSize(kwDc: number): number {
  return Math.round(kwDc * BATTERY_KWH_PER_KW_DC);
}

export function projectEconomics(kwDc: number, batteryKwh = batteryForSize(kwDc), recIn?: Partial<RecInputs>): ProjectEconomics {
  const recInputs = defaultRecInputs(kwDc, recIn);
  const rec = recContract(recInputs);
  const wattsDc = kwDc * 1000;
  const solarCost = wattsDc * SOLAR_COST_PER_W_DC;
  const batteryCost = batteryKwh * BATTERY_COST_PER_KWH;
  const buildCost = solarCost + batteryCost;
  const applicationFee = kwDc * APPLICATION_FEE_PER_KW;
  const amerenSolarRebate = kwDc * AMEREN_SOLAR_REBATE_PER_KW_DC;
  const amerenBatteryRebate = batteryKwh * BATTERY_REBATE_PER_KWH;
  const grossTakeout = amerenSolarRebate + amerenBatteryRebate + rec.firstPayment;
  const takeout = grossTakeout - rec.collateral;
  const factorProceeds = rec.tailFace * FACTOR_ADVANCE;
  const totalCash = takeout + factorProceeds;
  const coverage = buildCost > 0 ? totalCash / buildCost : 0;
  const ppaMonthly = kwDc * PPA_PER_KW_DC_MONTH;
  return {
    kwDc,
    wattsDc,
    batteryKwh,
    recInputs,
    rec,
    solarCost,
    batteryCost,
    installerBase: wattsDc * INSTALLER_BASE_PER_W_DC,
    installerDayOneBonus: wattsDc * INSTALLER_DAY_ONE_BONUS_PER_W_DC,
    buildCost,
    applicationFee,
    amerenSolarRebate,
    amerenBatteryRebate,
    firstRecPayment: rec.firstPayment,
    grossTakeout,
    recContractTotal: rec.contractValue,
    recCollateral: rec.collateral,
    takeout,
    factorFace: rec.tailFace,
    factorProceeds,
    totalCash,
    coverage,
    takeoutCoverage: coverage,
    apr: aprForCoverage(coverage),
    listable: coverage >= COVERAGE_MIN,
    creatorCashBack: applicationFee * CREATOR_CASH_MULTIPLE,
    creatorBonusCash: applicationFee * CREATOR_BONUS_CASH_MULTIPLE,
    creatorTotal: applicationFee * CREATOR_TOTAL_MULTIPLE,
    installerFactorShare: factorProceeds * FACTOR_TO_INSTALLER,
    ppaMonthly,
    ppaAnnual: ppaMonthly * 12,
  };
}

export function prebondWithdrawal(amount: number) {
  return {
    refund: amount * (1 - PREBOND_EXIT_FEE),
    toStayers: amount * PREBOND_EXIT_TO_STAYERS,
    toProtocol: amount * PREBOND_EXIT_TO_PROTOCOL,
  };
}

/** $ back per $1 lent at `apr` held `days`. */
export function payoutPerDollar(apr: number, days: number): number {
  return 1 + apr * (days / 365);
}
