# Factor the REC tail, pay a flat 24% APR, and reward early lenders with points

## The deal

The six-year Yield NFT goes away. When the first Illinois Shines payment arrives, HELIO sells the remaining 50% of the REC contract for **65% of its face value**. All the cash lands around day 90–120, and lenders are paid out in full then.

10 kW + 64 kWh roof:

```text
Build (lender principal)                 $27,500
Ameren rebates + first REC − 5% hold     $29,805
Factored tail  ($8,450 face × 65%)       + $5,493
Cash at day 90–120                       $35,298   (1.28x of build)
```

## What lenders get

1. **Flat 24% APR, the same for every lender.** Interest starts the moment a deposit lands, so money that waits for the note to fill still earns. There is no rising-rate auction. Notes fill first come, first served.
   - The pitch becomes: "$1 in, ~$1.08 back in 120 days. 24% APR in USDC."
2. **HELIO Points for filling early.** The points multiplier depends on **how full the note is**, not on the clock: **2x** at 0% filled, dropping steadily to **1x** at 100% filled.
   - Points = dollars deposited × the multiplier over that part of the fill.
   - Points carry no cash promise in this version. They are a loyalty and future-rewards balance, shown on each note and in the portfolio.
   - Early lenders earn more points. Every lender gets the same interest rate.

Lenders are well covered. At the full 120 days, lenders are owed $27,500 plus $2,170 in interest, and $35,298 comes in. That leaves a buffer of about $5.6k.

## Payout order at takeout

1. Lenders: principal plus 24% interest for the actual days held
2. Creator: 3x cash ($600). The 2x yield credit becomes an extra **2x cash** ($400), because there is no longer an NFT. The creator's reward stays at 5x.
3. Installer: the base and day-one bonus are unchanged. The installer's share becomes **7% of the factored proceeds** ($385).
4. HELIO keeps the rest, about $4.6k on the example roof. The 5% collateral ($845) is released to HELIO later, by a manual admin action. The customer's monthly payments still go 100% to HELIO.

Lenders can no longer come up short, so the logic that deferred the creator's cash into tail payments is removed.

## Unchanged

The $20/kW application fee (at risk), creator reward, 2.5% withdrawal fee before the note fills (1.5% to lenders who stay, 1% to protocol), the customer's power agreement, the brand, and the /solar page. A withdrawal before the note fills gives up points in proportion to the amount withdrawn.

## App changes

- **Economics:** add the factoring constants and a flat APR constant. Replace the rising-rate auction with a points multiplier based on how full the note is. Add the new payout order.
- **Note records:** remove the Yield NFT and tail fields. Add factor proceeds, points per lender, deposit timestamps (for interest from the day of deposit), and the creator's 2x cash.
- **Ledger:** record the factoring sale together with the takeout. Remove the actions for recording tail payments and claiming NFT cash. Collateral release goes to HELIO.
- **Pages:**
  - Note cards and note pages show "24% APR" and the live "Points 1.6x" in place of the live rate.
  - The underwriting table replaces the "Long tail" column with "Factored tail".
  - The portfolio shows positions, the payout at takeout, and total points.
  - **The market page and its nav link are retired.**
  - The admin console swaps "Record tail" for "Factor tail".
  - The docs are rewritten.
- **/welcome:** new hero numbers ("24% APR", "$1 → $1.08 in 120 days", "1.28x coverage", "Up to 2x points"). The rising-rate explainer becomes a points explainer. All mentions of six years, the $1.20 figure and Yield NFTs are removed.
- **Demo data and tests:** the demo is reset. Tests cover interest from the day of deposit, the points multiplier and the payout order.
- **Project memory:** replace the rules on the Yield NFT tail and early-funder APR with the factoring, flat APR and points rules.

## Technical notes

- Constants: `FACTOR_ADVANCE = 0.65`, `LENDER_APR = 0.24`, `POINTS_START = 2`, `POINTS_END = 1`, and `CREATOR_BONUS_CASH_MULTIPLE = 2`.
- Points for a deposit that moves the note's fill from f0 to f1 = the integral of `2 − f` from f0 to f1, times the build cost. This makes it the same whether the money comes in one deposit or many.
- Interest per deposit = `amount × 0.24 × daysFromDeposit / 365`.
- `ledger.ts` stays the single source of truth for note state changes. The Anchor program is still out of scope.
