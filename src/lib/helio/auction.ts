/**
 * HELIO note funding math.
 *
 * Each note carries one fixed APR (set from its REC coverage, see economics.ts).
 * Interest accrues per deposit from the moment it lands until settlement.
 * Early lenders earn HELIO Points: 2x per dollar at 0% filled, falling linearly
 * to 1x at 100% filled. Points carry no cash promise.
 */

export const LOCKUP_MIN_DAYS = 90;
export const LOCKUP_MAX_DAYS = 120;

export const POINTS_START = 2;
export const POINTS_END = 1;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Points multiplier at fill fraction f (0..1). */
export function pointsMultiplier(fill: number): number {
  return POINTS_START - (POINTS_START - POINTS_END) * clamp(fill, 0, 1);
}

/** Points for moving a note of size `target` from fill f0 to f1 — ∫(2 − f) df × target. */
export function pointsForFill(target: number, f0: number, f1: number): number {
  const g = (f: number) => POINTS_START * f - ((POINTS_START - POINTS_END) * f * f) / 2;
  return target * (g(clamp(f1, 0, 1)) - g(clamp(f0, 0, 1)));
}

/** Simple (non-compounding) interest. */
export function noteInterest(principal: number, apr: number, days: number): number {
  return principal * apr * (days / 365);
}

export function periodYield(apr: number, days: number): number {
  return apr * (days / 365);
}
