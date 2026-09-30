/**
 * Illinois Shines (Adjustable Block Program) REC contract engine, 2026–27.
 *
 *   quantity  = floor( min(Part I, Part II) ), or the PVWatts-style estimate:
 *               Σ_{t=1..15} kW-AC × CF × 8.76 MWh × 0.995^(t-1), floored
 *   $/REC     = DG table (Group A Ameren/MISO, Group B ComEd/PJM) by AC size bin
 *               + adders (customer-owned Small DG +$20, EEC +$5)
 *   contract  = quantity × $/REC
 *   schedule  = Small DG (≤25 kW AC) 50% at energization; Large DG 15%;
 *               remainder ratably over 6 years (24 quarters)
 *   collateral = 5% of contract value, held by the program
 *
 * Every input is on the Illinois Shines application, so the engine runs at note creation.
 */

export type RecGroup = "A" | "B";

export interface RecInputs {
  /** A = Ameren / MidAmerican / Mt. Carmel / MISO co-ops. B = ComEd / PJM co-ops. */
  group: RecGroup;
  /** Inverter (AC) nameplate. */
  kwAc: number;
  /** Approved capacity factor, decimal. */
  capacityFactor: number;
  /** Customer-owned, no federal credit: +$20/REC (Small DG only). */
  customerOwned: boolean;
  /** Equity Eligible Contractor DG: +$5/REC. */
  eec: boolean;
  /** Contracted 15-year REC quantities from the portal, if known. */
  partIQty: number | null;
  partIIQty: number | null;
  /** Price table vintage. Only 2026–27 is modelled. */
  programYear: string;
}

export const REC_PROGRAM_YEAR = "2026–27";
export const REC_CF_DEFAULT = 0.1642;
export const REC_HOURS = 8760;
export const REC_TERM_YEARS = 15;
export const REC_DEGRADATION = 0.005;
export const SMALL_DG_MAX_KW_AC = 25;
export const SMALL_DG_FIRST_PCT = 0.5;
export const LARGE_DG_FIRST_PCT = 0.15;
export const REC_TAIL_QUARTERS = 24;
export const REC_COLLATERAL_PCT = 0.05;
export const ADDER_CUSTOMER_OWNED = 20;
export const ADDER_EEC = 5;
/** Default DC/AC ratio when only the DC size is known. */
export const DC_AC_RATIO = 1.2;

export const DG_REC_PRICES: ReadonlyArray<{ maxKwAc: number; label: string; A: number; B: number }> = [
  { maxKwAc: 10, label: "0–10 kW", A: 70.37, B: 80.77 },
  { maxKwAc: 25, label: ">10–25 kW", A: 60.92, B: 79.21 },
  { maxKwAc: 100, label: ">25–100 kW", A: 59.53, B: 69.65 },
  { maxKwAc: 200, label: ">100–200 kW", A: 55.63, B: 65.09 },
  { maxKwAc: 500, label: ">200–500 kW", A: 45.64, B: 53.4 },
  { maxKwAc: 2000, label: ">500–2,000 kW", A: 42.37, B: 49.57 },
  { maxKwAc: 5000, label: ">2,000–5,000 kW", A: 31.96, B: 37.39 },
];

export const GROUP_LABEL: Record<RecGroup, string> = { A: "Group A · Ameren Illinois", B: "Group B · ComEd" };
export const GROUP_UTILITY: Record<RecGroup, string> = { A: "Ameren Illinois", B: "ComEd" };

export function defaultRecInputs(kwDc: number, over: Partial<RecInputs> = {}): RecInputs {
  return {
    group: "A",
    kwAc: Math.round((kwDc / DC_AC_RATIO) * 100) / 100,
    capacityFactor: REC_CF_DEFAULT,
    customerOwned: true,
    eec: false,
    partIQty: null,
    partIIQty: null,
    programYear: REC_PROGRAM_YEAR,
    ...over,
  };
}

export function priceBin(kwAc: number) {
  return DG_REC_PRICES.find((b) => kwAc <= b.maxKwAc) ?? null;
}

export const isSmallDg = (kwAc: number) => kwAc <= SMALL_DG_MAX_KW_AC;

/** PVWatts-style estimate: 15 degraded years, floored to whole RECs. */
export function estimateRecQuantity(kwAc: number, cf: number): number {
  const yr1 = (kwAc * cf * REC_HOURS) / 1000;
  let sum = 0;
  for (let t = 0; t < REC_TERM_YEARS; t++) sum += yr1 * (1 - REC_DEGRADATION) ** t;
  return Math.floor(sum + 1e-9);
}

export interface RecContract {
  estimatedQty: number;
  /** Quantity actually contracted (lesser of Part I / Part II, else the estimate). */
  quantity: number;
  qtySource: "Part I/II" | "estimate";
  binLabel: string;
  basePrice: number;
  adders: number;
  price: number;
  contractValue: number;
  category: "Small DG" | "Large DG";
  firstPct: number;
  firstPayment: number;
  tailFace: number;
  collateral: number;
}

export function recContract(i: RecInputs): RecContract {
  const bin = priceBin(i.kwAc);
  if (!bin) throw new Error(`No DG price bin for ${i.kwAc} kW AC (max 5,000 kW).`);
  const small = isSmallDg(i.kwAc);
  const estimatedQty = estimateRecQuantity(i.kwAc, i.capacityFactor);
  const parts = [i.partIQty, i.partIIQty].filter((q): q is number => q !== null && q > 0);
  const quantity = parts.length ? Math.floor(Math.min(...parts)) : estimatedQty;
  const basePrice = bin[i.group];
  const adders = (i.customerOwned && small ? ADDER_CUSTOMER_OWNED : 0) + (i.eec ? ADDER_EEC : 0);
  const price = basePrice + adders;
  const contractValue = quantity * price;
  const firstPct = small ? SMALL_DG_FIRST_PCT : LARGE_DG_FIRST_PCT;
  const firstPayment = contractValue * firstPct;
  return {
    estimatedQty,
    quantity,
    qtySource: parts.length ? "Part I/II" : "estimate",
    binLabel: `${bin.label} AC`,
    basePrice,
    adders,
    price,
    contractValue,
    category: small ? "Small DG" : "Large DG",
    firstPct,
    firstPayment,
    tailFace: contractValue - firstPayment,
    collateral: contractValue * REC_COLLATERAL_PCT,
  };
}
