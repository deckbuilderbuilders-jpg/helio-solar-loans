/**
 * HELIO full-stack economics.
 *
 * A HELIO project is a customer power-purchase agreement on an Illinois roof.
 * The customer gets solar + storage at zero cost and a 50% smaller power bill.
 * Title passes to the customer so the job earns the Illinois Shines
 * customer-owned adder (+$20/REC).
 *
 * Capital stack, per roof:
 *   1. Creator pays the $20/kW state application fee. 100% at risk.
 *   2. Lenders fund the build in a reverse Dutch auction (see auction.ts).
 *   3. Day 90–120 takeout (Ameren solar rebate + Ameren storage rebate +
 *      Illinois Shines first 50% REC payment) returns lender principal.
 *   4. Long-tail cash (customer PPA + the remaining 50% REC contract, paid
 *      over 24 quarters) is the profit layer, split to Yield NFT holders,
 *      HELIO, and the installer.
 */

/* ---------------------------------- Solar --------------------------------- */

/** Installed solar cost, per watt DC: hardware + crew. */
export const SOLAR_HARDWARE_PER_W_DC = 0.8;
export const INSTALLER_BASE_PER_W_DC = 0.33;
/** Paid only when the crew finishes the install in one day. */
export const INSTALLER_DAY_ONE_BONUS_PER_W_DC = 0.02;
export const INSTALLER_LABOR_PER_W_DC = INSTALLER_BASE_PER_W_DC + INSTALLER_DAY_ONE_BONUS_PER_W_DC;
export const SOLAR_COST_PER_W_DC = SOLAR_HARDWARE_PER_W_DC + INSTALLER_LABOR_PER_W_DC; // 1.15

/** Ameren DG rebate, $300/kW-DC. */
export const AMEREN_SOLAR_REBATE_PER_W_DC = 0.3;
/** Illinois Shines first payment: 50% of the 15-year Group A contract. */
export const FIRST_REC_PER_W_DC = 0.845;
/** Remaining 50% of the contract, paid over 24 quarters. */
export const REC_TAIL_PER_W_DC = 0.845;
export const SOLAR_TAKEOUT_PER_W_DC = AMEREN_SOLAR_REBATE_PER_W_DC + FIRST_REC_PER_W_DC; // 1.145

/* --------------------------------- Storage -------------------------------- */

export const BATTERY_HARDWARE_PER_KWH = 225;
export const BATTERY_INSTALL_PER_KWH = 25;
export const BATTERY_COST_PER_KWH = BATTERY_HARDWARE_PER_KWH + BATTERY_INSTALL_PER_KWH; // 250
/** Ameren paired-storage rebate. */
export const BATTERY_REBATE_PER_KWH = 300;
/** Standard pairing: 64 kWh on a 10 kW-DC roof. */
export const BATTERY_KWH_PER_KW_DC = 6.4;

/* --------------------------- Application / creation ----------------------- */

/** Illinois Shines application fee, charged per kW. Creator funds it. */
export const APPLICATION_FEE_PER_KW = 20;
/** Creator reward: 3x back in day-90 cash. */
export const CREATOR_CASH_MULTIPLE = 3;
/** Creator reward: 2x credited as Yield NFT equity. */
export const CREATOR_YIELD_MULTIPLE = 2;

/** Pre-bonding exit fee on a lender withdrawal. */
export const PREBOND_EXIT_FEE = 0.025;
/** Of that fee, the share redistributed to the lenders who stayed. */
export const PREBOND_EXIT_TO_STAYERS = 0.015;
/** Of that fee, the share kept by the protocol. */
export const PREBOND_EXIT_TO_PROTOCOL = 0.01;

/* ------------------------------ Customer PPA ------------------------------ */

/** Target reduction on the customer's Ameren bill. */
export const CUSTOMER_BILL_REDUCTION = 0.5;
/** Customer PPA payment to HELIO, per kW-DC per month (≈$90/mo on 10 kW). */
export const PPA_PER_KW_DC_MONTH = 9;
export const PPA_TERM_YEARS = 15;

/* ------------------------------- Tail splits ------------------------------ */

/** Long-tail cash to Yield NFT holders. */
export const TAIL_TO_YIELD = 0.65;
/** Long-tail cash booked as the HELIO protocol fee. */
export const TAIL_PROTOCOL_FEE = 0.35;
/** Installer share, taken out of the protocol fee. */
export const INSTALLER_SHARE_OF_PROTOCOL_FEE = 0.2;
/** Net splits after the installer carve-out. */
export const TAIL_TO_INSTALLER = TAIL_PROTOCOL_FEE * INSTALLER_SHARE_OF_PROTOCOL_FEE; // 0.07
export const TAIL_TO_HELIO = TAIL_PROTOCOL_FEE - TAIL_TO_INSTALLER; // 0.28

/** REC tail schedule. */
export const TAIL_QUARTERS = 24;

/* -------------------------------- Modelling ------------------------------- */

export interface ProjectEconomics {
  kwDc: number;
  wattsDc: number;
  batteryKwh: number;
  /** Build */
  solarCost: number;
  batteryCost: number;
  installerBase: number;
  installerDayOneBonus: number;
  buildCost: number;
  applicationFee: number;
  /** Day 90–120 takeout */
  amerenSolarRebate: number;
  amerenBatteryRebate: number;
  firstRecPayment: number;
  takeout: number;
  takeoutSurplus: number;
  /** Creator */
  creatorCashBack: number;
  creatorYieldCredit: number;
  /** Long tail */
  recTailTotal: number;
  recTailPerQuarter: number;
  ppaMonthly: number;
  ppaAnnual: number;
  tailAnnual: number;
  tailToYieldAnnual: number;
  tailToHelioAnnual: number;
  tailToInstallerAnnual: number;
  /** Coverage of the build by day-90 cash. */
  takeoutCoverage: number;
}

export function batteryForSize(kwDc: number): number {
  return Math.round(kwDc * BATTERY_KWH_PER_KW_DC);
}

export function projectEconomics(kwDc: number, batteryKwh = batteryForSize(kwDc)): ProjectEconomics {
  const wattsDc = kwDc * 1000;
  const solarCost = wattsDc * SOLAR_COST_PER_W_DC;
  const batteryCost = batteryKwh * BATTERY_COST_PER_KWH;
  const buildCost = solarCost + batteryCost;
  const applicationFee = kwDc * APPLICATION_FEE_PER_KW;

  const amerenSolarRebate = wattsDc * AMEREN_SOLAR_REBATE_PER_W_DC;
  const amerenBatteryRebate = batteryKwh * BATTERY_REBATE_PER_KWH;
  const firstRecPayment = wattsDc * FIRST_REC_PER_W_DC;
  const takeout = amerenSolarRebate + amerenBatteryRebate + firstRecPayment;

  const creatorCashBack = applicationFee * CREATOR_CASH_MULTIPLE;
  const creatorYieldCredit = applicationFee * CREATOR_YIELD_MULTIPLE;

  const recTailTotal = wattsDc * REC_TAIL_PER_W_DC;
  const recTailPerQuarter = recTailTotal / TAIL_QUARTERS;
  const ppaMonthly = kwDc * PPA_PER_KW_DC_MONTH;
  const ppaAnnual = ppaMonthly * 12;
  const tailAnnual = ppaAnnual + recTailPerQuarter * 4;

  return {
    kwDc,
    wattsDc,
    batteryKwh,
    solarCost,
    batteryCost,
    installerBase: wattsDc * INSTALLER_BASE_PER_W_DC,
    installerDayOneBonus: wattsDc * INSTALLER_DAY_ONE_BONUS_PER_W_DC,
    buildCost,
    applicationFee,
    amerenSolarRebate,
    amerenBatteryRebate,
    firstRecPayment,
    takeout,
    takeoutSurplus: takeout - buildCost,
    creatorCashBack,
    creatorYieldCredit,
    recTailTotal,
    recTailPerQuarter,
    ppaMonthly,
    ppaAnnual,
    tailAnnual,
    tailToYieldAnnual: tailAnnual * TAIL_TO_YIELD,
    tailToHelioAnnual: tailAnnual * TAIL_TO_HELIO,
    tailToInstallerAnnual: tailAnnual * TAIL_TO_INSTALLER,
    takeoutCoverage: takeout / buildCost,
  };
}

/** What a pre-bonding lender gets back if they pull out before the note fills. */
export function prebondWithdrawal(amount: number) {
  return {
    refund: amount * (1 - PREBOND_EXIT_FEE),
    toStayers: amount * PREBOND_EXIT_TO_STAYERS,
    toProtocol: amount * PREBOND_EXIT_TO_PROTOCOL,
  };
}

/** Annual cash-on-cash yield a Yield NFT streams per dollar of note principal. */
export function yieldNftAnnualRate(e: ProjectEconomics): number {
  return e.tailToYieldAnnual / e.buildCost;
}
