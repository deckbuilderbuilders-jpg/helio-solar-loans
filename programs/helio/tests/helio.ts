/**
 * Anchor test sketch for the flagship 10 kW AC / 12 kW-DC Ameren job.
 *
 * Underwriting (mirrored 1:1 by src/lib/helio in the web app):
 *   install / funding target = 12 kW-DC × 1000 × $1.00  = $12,000
 *   panels required          = ceil(12,000 W / 400 W)   = 30 panels × $400 = $12,000
 *   REC price                = $70.37 + $20 + $5        = $95.37 / REC
 *   RECs (15 yr, 16.42% CF, 0.5% degradation)           = 208
 *   REC purchase amount      = 208 × $95.37             = $19,836.96
 *   first REC payment (50%)  =                            $9,918.48
 *   Ameren rebate            = 12 kW-DC × $300          = $3,600
 *   less 5% collateral, 3% reserve → takeout            ≈ $12,150
 */
import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";

const PANEL_WATTS = 400;
const PANEL_PRICE = 400;

describe("helio — flagship 10 kW job", () => {
  it("derives the funding target and panel count", () => {
    const kwDc = 12;
    const target = kwDc * 1000 * 1.0;
    const panels = Math.ceil((kwDc * 1000) / PANEL_WATTS);
    assert.equal(target, 12_000);
    assert.equal(panels, 30);
    assert.equal(panels * PANEL_PRICE, target);
  });

  it("splits the REC tail 80/20 between shares and the originator", () => {
    const recPurchase = 208 * 95.37;
    const tail = recPurchase * 0.5;
    const toShares = tail * 0.8;
    assert.closeTo(toShares, 7_934.78, 0.5);
    assert.closeTo(tail - toShares, 1_983.7, 0.5);
  });

  it("pays a 4/30 share holder pro-rata", () => {
    const takeout = 12_150;
    const share = 4 / 30;
    assert.closeTo(takeout * share, 1_620, 1);
  });

  it("keeps the Anchor provider wired for on-chain runs", () => {
    anchor.setProvider(anchor.AnchorProvider.env());
    assert.ok(anchor.getProvider());
  });
});
