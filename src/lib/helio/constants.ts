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

/** Protocol takes 10% of interest. */
export const PROTOCOL_FEE_BPS = 1000;
/** Grace after loan expiry before Foreclose is enabled: 72 hours. */
export const GRACE_SECONDS = 72 * 3600;
/** One 30-day extension at +6% APY penalty. */
export const EXTENSION_SECONDS = 30 * 86400;
export const EXTENSION_PENALTY_BPS = 600;

export const SECONDS_PER_YEAR = 365 * 86400;
export const USDC_DECIMALS = 6;

/** Default offer grid — the order-book starting offers. */
export const OFFER_GRID = [
  {
    gate: 2,
    gateLabel: "G2 ICC Trade Date",
    termDays: 90,
    apyBps: 2800,
    originationBps: 200,
    ltvBps: 7000,
    why: "construction + program-admin queue risk",
  },
  {
    gate: 3,
    gateLabel: "G3 PTO / rebate-fileable",
    termDays: 60,
    apyBps: 2400,
    originationBps: 150,
    ltvBps: 8000,
    why: "rebate clock is 60 days by tariff",
  },
  {
    gate: 4,
    gateLabel: "G4 Part II / Schedule B",
    termDays: 30,
    apyBps: 1800,
    originationBps: 100,
    ltvBps: 8800,
    why: "invoice factoring against a utility",
  },
] as const;

/** Market comps as of mid-2026, shown in the "Why this yield" drawer. */
export const MARKET_COMPS = [
  { name: "Kamino / Jupiter / Save USDC supply", band: "~3–8% APY", low: 3, high: 8, kind: "idle stables" },
  { name: "Tokenized private credit (Maple, Goldfinch, Huma, Credix)", band: "~8–18% APY", low: 8, high: 18, kind: "private credit" },
  { name: "US construction bridge / hard money", band: "~9.5–13.5% APY", low: 9.5, high: 13.5, kind: "real-estate debt" },
  { name: "B2B invoice factoring", band: "0.50–3.50% per 30 days", low: 6, high: 42, kind: "factoring" },
  { name: "Construction progress-billing factoring", band: "2–5% per 30 days (24–60% APR)", low: 24, high: 60, kind: "factoring" },
] as const;

export const GATES = [
  { id: 0, code: "G0", title: "Sale / Disclosure Form signed" },
  { id: 1, code: "G1", title: "Part I verified (capacity reserved)" },
  { id: 2, code: "G2", title: "ICC Trade Date (REC contract path live)" },
  { id: 3, code: "G3", title: "Permission to Operate + rebate filed" },
  { id: 4, code: "G4", title: "Part II verified / Schedule B / first invoice window open" },
  { id: 5, code: "G5", title: "Rebate received (USDC credited to escrow)" },
  { id: 6, code: "G6", title: "First REC payment received" },
  { id: 7, code: "G7", title: "Loan repaid" },
] as const;
