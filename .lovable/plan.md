# Factor the REC tail: cash up front, 24–25% all-in APR

## The deal

The six-year Yield NFT goes away. When the first Illinois Shines payment arrives (at energization / Part II), HELIO also sells the remaining 50% of the REC contract to a factor for **65% of its face value**. All cash now lands in one window, around day 90–120, and lenders are paid out in full at that point. Nothing is left waiting on a six-year payment stream.

10 kW + 64 kWh roof:

```text
Build (lender principal)                 $27,500
Ameren rebates + first REC − 5% hold     $29,805
Factored tail  ($8,450 face × 65%)       + $5,493
Cash at day 90–120                       $35,298   (1.28x of build)
```

## How lenders earn 24–25% (the recommended structure)

Lenders earn two things, both paid in cash at takeout:

1. **Locked auction APR.** The rate rises over 72 hours from **15% to a 20% cap**. It used to be 12% to 25%. Each deposit keeps the rate that was live when it came in, as it does today.
2. **Factor Bonus.** This is paid from the factored tail. It works out to **5% APR per 1x of weight**. Weight still falls from 1.8x to 1x over the same 72 hours.

```text
First dollar in:  15% + 1.8 × 5% = 24% all-in
Last dollar in:   20% + 1.0 × 5% = 25% all-in
```

Every lender lands between 24% and 25% whenever they come in. Timing still involves a trade-off: early lenders get more bonus, and late lenders get a higher rate. The headline for funders becomes: **"$1 in, ~$1.08 back in 120 days. 24–25% APR, paid in USDC."**

Why this appeals to stablecoin investors: returns are in the low-to-mid 20s, the money is locked for only 90–120 days, it is paid in one lump, and no NFT has to be priced or sold later. There is also a lot of cover. At worst (20% cap for 120 days, plus the bonus), lenders are owed about $29.9k, and $35.3k arrives. That leaves roughly $5.4k of buffer before the creator or HELIO get paid.

## Payout order at takeout (replaces the old tail split)

1. Lenders: principal, then locked interest, then the Factor Bonus
2. Creator: 3x cash ($600). The 2x yield credit becomes an extra **2x cash** ($400), because there is no longer an NFT to credit it to. That keeps the creator's reward at 5x.
3. Installer: $0.33/W base plus the $0.02/W day-one bonus, both unchanged. Their tail share becomes **7% of the factored proceeds** ($385), the same share they had before.
4. HELIO: the rest (about $4.4k on the example roof)
5. The 5% collateral ($845) is released to HELIO later, still by a manual admin action. The customer's payments still go 100% to HELIO.

Because lenders can no longer come up short, the logic that pushed part of the creator's cash into later tail payments is removed.

## Unchanged

The $20/kW application fee (at risk), creator creation reward, 2.5% pre-fill withdrawal fee (1.5% to lenders who stay, 1% to protocol), the 72-hour auction, 1.8x→1x weights, per-deposit locked rates, the customer's power agreement, the brand, and the /solar page.

## App changes

- **Economics and auction math:** factor constants (65% of face), new rate range (15% to 20%), Factor Bonus math, new payout order, and an all-in APR helper.
- **Note records:** remove the Yield NFT fields, tail quarters and payments per share. Add factor proceeds, the bonus paid to each lender, and the creator's 2x cash.
- **Ledger:** record the factoring sale together with the takeout. Remove the actions for recording tail payments and claiming NFT cash. Collateral release goes to HELIO.
- **Pages:**
  - Note cards and note pages show "All-in APR" (rate + bonus) next to the weight.
  - The underwriting table replaces the "Long tail" column with "Factored tail".
  - Portfolio shows positions with their payout at takeout, not NFTs.
  - The **market page and its nav link are retired**.
  - The admin console swaps "Record tail" for "Factor tail".
  - Docs are rewritten for the new model.
- **/welcome:** new hero numbers ("24–25% APR", "$1 → $1.08 in 120 days", "1.28x coverage"). The tail card becomes "Tail sold up front at 65%". All references to six years, 24 quarters, $1.20 and Yield NFTs are removed.
- **Demo data:** the example notes and saved state are reset for the new model. Tests are updated for the payout order, the bonus and all-in APR.
- **Project memory:** replace the "Yield NFTs share REC tail" rule with the factoring rule.

## Technical notes

- Constants: `FACTOR_ADVANCE = 0.65`, `FACTOR_BONUS_APR_PER_WEIGHT = 0.05`, `APR_FLOOR = 0.15`, `APR_CAP = 0.20`, and `CREATOR_YIELD_MULTIPLE` becomes `CREATOR_BONUS_CASH_MULTIPLE = 2`.
- Factor Bonus per lender = `weightDollars × 0.05 × days/365`, paid from `factorProceeds`, which cover it about 8x.
- `ledger.ts` stays the single source of truth for note state changes.
- The Anchor program is still out of scope (already on the roadmap).
