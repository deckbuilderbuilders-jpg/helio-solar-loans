# Cover the 5% Illinois Shines collateral

## The problem
Illinois Shines holds back 5% of the full 15-year REC contract as collateral. On a 10 kW roof the contract is $16,900 (2 x $0.845/W), so **$845 never shows up in the day 90–120 check**.

Cash that actually lands on a 10 kW + 64 kWh roof:

```text
Ameren solar + storage + first REC     $30,650
Collateral held back (5%)              -   845
Cash that lands                        $29,805
Build (lender principal)               -27,500
Creator 3x cash                        -   600
Left for lender interest               $ 1,705
```

| Clearing APR / lockup | Lender interest | Surplus after collateral |
|---|---|---|
| 12%, 90 days | $814 | +$891 |
| 20%, 90 days | $1,356 | +$349 |
| 25%, 120 days | $2,260 | -$555 |

So the 5% fits in almost every case. It only runs short when a note clears near the rate cap and takes the full 120 days.

## Recommended approach: payment order plus a tail catch-up
1. **The collateral comes off the top.** The state keeps it, and HELIO models the takeout as $29,805, not $30,650.
2. **Lenders are paid first, always in full.** Principal plus each lender's locked interest comes out of the check before anything else.
3. **Next comes the creator's 3x cash.** In the rare case where the check falls short, the creator's cash is paid late rather than cut: it's topped up from the first REC-tail quarters before any Yield NFT payouts. The creator's money was the only money at risk, so they wait, not the lenders.
4. **Next comes the HELIO surplus,** whatever is left.
5. **Returned collateral is a bonus for Yield NFT holders.** When Illinois Shines releases the 5% after the REC delivery obligation is met, it flows to Yield NFT holders. That's a small extra payment on top of the six-year tail, and a line funders can see on every note.

Why this order: lenders never carry the collateral risk, so the "$1 back" promise holds. The small shortfall case lands on the party that already agreed to be at risk. And HELIO doesn't need to front $845 per roof in cash.

### Other options considered
- **HELIO fronts the 5% from its treasury.** Simple, but it ties up $845 per roof across every job.
- **Cut the creator reward to 2x cash.** Always covers the gap, but it weakens the launch incentive we just set.
- **Raise the build note by $845.** Lenders would fund money that pays for no hardware, and more interest would be owed.

## What changes in the app
- The underwriting table gets a "Collateral held (5%)" row and shows the cash that actually lands. It also shows the surplus or shortfall at the live rate, plus a "Collateral returned to Yield NFTs" line.
- The admin's "record takeout" pays out in the new order. Any unpaid creator cash is tracked and paid from the first tail quarters before NFT holders.
- A new admin action, "Release collateral", sends the 5% to Yield NFT holders.
- Each note's page shows a warning when the live rate and lockup would leave the creator's cash short.
- The welcome page shows coverage using the cash that actually lands.
- The docs get a short collateral section, and the tests cover the full-coverage case, the shortfall catch-up case and the release payout.

## Technical details
- `economics.ts`: add `REC_COLLATERAL_PCT = 0.05`, plus `recContractTotal`, `recCollateral`, `netTakeout` and `takeoutCoverage` (the last now based on net takeout).
- `types.ts` HelioNote: add `creatorOwed: number` and `collateralReleased: boolean`.
- `ledger.ts`:
  - `recordTakeout` pays in this order: lenders P+I, creator (the unpaid remainder goes to `creatorOwed`), treasury.
  - `recordTail` pays `creatorOwed` first, then the 65/28/7 split.
  - New `releaseCollateral(admin, noteId)` sends 100% to `accPerWeight`.
- `oracle.tsx` gets a release button. `Economics.tsx` gets the new rows. `welcome.tsx` coverage figures use net takeout.
- `ledger.test.ts` gets three new cases. The store key is bumped so the demo data refreshes.
- Open fact to confirm: exactly when Illinois Shines releases the collateral. It's modelled as a manual admin release, so the date isn't hardcoded.
