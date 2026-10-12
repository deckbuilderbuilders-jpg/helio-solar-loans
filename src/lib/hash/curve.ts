/**
 * Pump.fun-style constant-product bonding curve, scaled per project.
 * pump.fun: 30 virtual SOL, sells ~73.9% of virtual tokens by graduation at 85 SOL raised.
 * Here: graduation raise = project cost (USD); HASH sold = project TH × HASH_PER_TH.
 */
export const HASH_PER_TH = 1000; // genesis: 100 TH ↔ 100,000 HASH
export const UNBOND_FEE = 2.5; // flat USD to pull funds before graduation
export const HOLDER_SHARE = 0.8; // 80% of BTC to HASH holders, 20% to the DAO
export const SATS_PER_TH_DAY = 50; // estimate, update from live hashprice

const PUMP_VIRTUAL = 30 / 85; // virtual USD as a fraction of the raise

export function curveFor(raise: number, th: number) {
  const x0 = raise * PUMP_VIRTUAL;
  const sold = th * HASH_PER_TH;
  const y0 = (sold * (x0 + raise)) / raise; // so that `sold` HASH leave the curve at full raise
  return { x0, y0, k: x0 * y0 };
}

type Curve = ReturnType<typeof curveFor>;

/** HASH out for `usd` in, given `raised` so far. */
export function hashOut(c: Curve, raised: number, usd: number) {
  const before = c.y0 - c.k / (c.x0 + raised);
  const after = c.y0 - c.k / (c.x0 + raised + usd);
  return after - before;
}

/** USD back (before fee) for selling `hash` back into the curve. */
export function usdBack(c: Curve, raised: number, hash: number) {
  const ySold = c.y0 - c.k / (c.x0 + raised);
  const x = c.k / (c.y0 - (ySold - hash)) - c.x0;
  return raised - x;
}

/** Current price, USD per HASH. */
export function price(c: Curve, raised: number) {
  const x = c.x0 + raised;
  return (x * x) / c.k;
}
