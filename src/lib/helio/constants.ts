/**
 * HELIO hard economic constants — Illinois program year 2026–27, Ameren Group A.
 * Every number here is cited in /docs. Do not tune these without a source.
 */

/** Borrower basis: $1.00 per watt DC installed. */
export const INSTALL_COST_PER_WATT_DC = 1.0;

/** Ameren Illinois smart-inverter rebate: $300 per kW-DC (DS-1 / DS-2). */
export const AMEREN_SOLAR_REBATE_PER_KW_DC = 300;
/** Ameren battery rebate: $300 per kWh usable nameplate, only when paired with qualifying solar. */
export const AMEREN_BATTERY_REBATE_PER_KWH = 300;
/** Ameren rebate is paid ~60 calendar days after a complete post-PTO application. */
export const AMEREN_REBATE_CLOCK_DAYS = 60;

/** Illinois Shines 2026–27 Group A (Ameren / MISO) Distributed Generation REC prices, USD per REC. */
export const GROUP_A_DG_REC_PRICES: ReadonlyArray<{
  maxKwAc: number;
  price: number;
  label: string;
}> = [
  { maxKwAc: 10, price: 70.37, label: "0–10 kW AC" },
  { maxKwAc: 25, price: 60.92, label: ">10–25 kW AC" },
  { maxKwAc: 100, price: 59.53, label: ">25–100 kW AC" },
  { maxKwAc: 200, price: 55.63, label: ">100–200 kW AC" },
  { maxKwAc: 500, price: 45.64, label: ">200–500 kW AC" },
  { maxKwAc: 2000, price: 42.37, label: ">500–2000 kW AC" },
  { maxKwAc: 5000, price: 31.96, label: ">2000–5000 kW AC" },
];

/** Customer-owned Small DG adder (no federal ITC claimed): +$20 / REC. */
export const CUSTOMER_OWNED_ADDER = 20;
/** Equity Eligible Contractor DG adder: +$5 / REC. */
export const EEC_ADDER = 5;

/** REC quantity engine (ABP contract defaults). */
export const CAPACITY_FACTOR = 0.1642;
export const HOURS_PER_YEAR = 8760;
export const REC_TERM_YEARS = 15;
export const ANNUAL_DEGRADATION = 0.005;

/** Small DG (≤25 kW AC) first REC payment = 50% at Energization / Part II. */
export const SMALL_DG_FIRST_PAYMENT_PCT = 0.5;
/** Large DG (>25 kW AC) first REC payment = 15%. */
export const LARGE_DG_FIRST_PAYMENT_PCT = 0.15;
export const SMALL_DG_MAX_KW_AC = 25;
/** Remainder paid ratably over 24 quarters (6 years). */
export const REC_TAIL_QUARTERS = 24;

/** REC-contract collateral lock: 5% of REC Purchase Amount. */
export const REC_COLLATERAL_PCT = 0.05;
/** Protocol haircut reserve: 3% of gross takeout. */
export const PROTOCOL_HAIRCUT_PCT = 0.03;

/** One Helio Panel = 400 W DC of underwriting capacity. */
export const PANEL_WATTS_DC = 400;
/** Mint price of one panel, in USDC. */
export const PANEL_PRICE_USDC = 400;
/** Shop pack sizes. */
export const PANEL_PACKS = [1, 5, 30] as const;

/** HELIO keeps 20% of the 6-year REC tail as originator; 80% flows to Project Shares. */
export const ORIGINATOR_TAIL_BPS = 2000;

export const SECONDS_PER_YEAR = 365 * 86400;
export const USDC_DECIMALS = 6;

/** Note lifecycle stages. Stages 3–7 are written by the oracle / admin. */
export const STAGES = [
  { id: 0, code: "S0", title: "Creator pays $20/kW application fee" },
  { id: 1, code: "S1", title: "Reverse Dutch auction open (12% → 25% APR)" },
  { id: 2, code: "S2", title: "Funded — clearing APR locked, 90–120 day lockup starts" },
  { id: 3, code: "S3", title: "Built — installer paid $0.33/W (+ $0.02/W day-one)" },
  { id: 4, code: "S4", title: "Ameren Permission to Operate, rebates filed" },
  { id: 5, code: "S5", title: "Takeout landed — lenders repaid P+I, creator 3x cash" },
  { id: 6, code: "S6", title: "REC tail streaming to Yield NFTs" },
  { id: 7, code: "S7", title: "REC tail complete (24 quarters)" },
] as const;
/** @deprecated alias kept for docs. */
export const GATES = STAGES;
