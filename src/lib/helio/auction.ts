/**
 * HELIO bridge-note auction math.
 *
 * A HELIO note is a fixed-term construction bridge loan against Illinois solar
 * takeout cash (Ameren DG rebate + the Illinois Shines first REC payment).
 * Cash is locked from funding until takeout lands: 90–120 days.
 *
 * Rate discovery is an ASCENDING reverse Dutch auction: the offered APR starts
 * at the floor and climbs on a clock until the note fills. Lenders who wait get
 * a better rate but risk the note clearing without them. Whoever fills the last
 * dollar sets the clearing APR, and every lender in the note earns it.
 */

/** Auction opens here. */
export const APR_FLOOR = 0.12;
/** Hard cap. The auction never prices above this. */
export const APR_CAP = 0.25;
/** Clock length: the APR walks floor -> cap over this many hours. */
export const AUCTION_HOURS = 72;

/** Lockup window, in days, from funding to takeout settlement. */
export const LOCKUP_MIN_DAYS = 90;
export const LOCKUP_MAX_DAYS = 120;

/** Cost basis, per watt DC. Hardware from the 31-line BOM; labor is crew cost. */
export const HARDWARE_COST_PER_W_DC = 0.8012;
export const LABOR_COST_PER_W_DC = 0.35;
export const INSTALL_COST_PER_W_DC = HARDWARE_COST_PER_W_DC + LABOR_COST_PER_W_DC;

/** Takeout, per watt DC, for a ≤10 kW AC customer-owned Ameren roof. */
export const AMEREN_REBATE_PER_W_DC = 0.3;
export const FIRST_REC_PAYMENT_PER_W_DC = 0.845;
export const TAKEOUT_PER_W_DC = AMEREN_REBATE_PER_W_DC + FIRST_REC_PAYMENT_PER_W_DC;

/** Advance rate: the note funds 85% of cost basis; the installer keeps skin in the game. */
export const ADVANCE_RATE = 0.85;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Offered APR at `hoursElapsed` into the clock. Linear walk, clamped at the cap. */
export function auctionApr(hoursElapsed: number): number {
  const p = clamp(hoursElapsed / AUCTION_HOURS, 0, 1);
  return APR_FLOOR + (APR_CAP - APR_FLOOR) * p;
}

/** Simple (non-compounding) interest on a note held to takeout. */
export function noteInterest(principal: number, apr: number, days: number): number {
  return principal * apr * (days / 365);
}

/** Absolute yield a lender earns over the lockup, not annualized. */
export function periodYield(apr: number, days: number): number {
  return apr * (days / 365);
}

/** Underwrite one roof from nameplate DC watts. */
export function underwriteNote(wattsDc: number, apr: number, days = LOCKUP_MIN_DAYS) {
  const cost = wattsDc * INSTALL_COST_PER_W_DC;
  const principal = cost * ADVANCE_RATE;
  const takeout = wattsDc * TAKEOUT_PER_W_DC;
  const interest = noteInterest(principal, apr, days);
  return {
    cost,
    principal,
    takeout,
    interest,
    /** Takeout dollars per dollar of principal + interest. */
    coverage: takeout / (principal + interest),
    repaid: principal + interest,
  };
}
