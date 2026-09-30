# Factor the REC tail, set each project's APR from its REC value, and reward early lenders with points

## The deal

The six-year Yield NFT goes away. When the first Illinois Shines payment arrives, HELIO sells the remaining 50% of the REC contract for **65% of its face value**. All the cash lands around day 90–120, and lenders are paid out in full then.

The Ameren rebates are fixed: $300 per kW of solar and $300 per kWh of battery. The REC contract changes from project to project because it depends on production. So each project's rate is set from its REC value when the oracle creates it.

## REC value engine (following your Illinois Shines spec)

The oracle enters these when it creates a project:
- AC size in kW (the DC size ÷ DC/AC ratio, 1.2 by default)
- Approved capacity factor (from PVWatts)
- Group A or B
- Adders: customer-owned +$20, EEC +$5
- The Part I and Part II estimates

```text
year-1 MWh   = kW-AC × CF × 8,760 / 1,000
quantity     = floor( Σ yr1..yr15 of yr1 × 0.995^(t-1) ), lesser of Part I / Part II
$/REC        = 2026–27 DG table (Group A or B, AC size bin) + adders
contract     = quantity × $/REC
first check  = 50% (Small DG ≤25 kW AC) or 15% (Large DG)
factored tail = the rest × 65%
collateral   = 5% of the contract, held back
```

Group B prices are added next to the existing Group A table.

## APR function: 18–24%, set by how well the project is covered

Coverage = (Ameren rebates + first REC − collateral + factored tail) ÷ build cost.

```text
coverage ≥ 1.30  → 18% APR   (rich REC value, low risk)
coverage 1.12–1.30 → straight line from 24% down to 18%
coverage < 1.12  → oracle rejects: project can't be listed
```

Why lower REC value means a higher rate: a thinner cushion is a riskier loan, so lenders are paid more. The 1.12 minimum makes sure that even at 24% for the full 120 days, lenders are paid back in full and the creator's 5x still fits.

Examples (10 kW DC + 64 kWh, 8.33 kW AC, CF 16.42%):

| Scenario | $/REC | Coverage | APR |
| --- | --- | --- | --- |
| Group A + customer-owned | $90.37 | ~1.26 | ~19.3% |
| Group A + customer-owned + EEC | $95.37 | ~1.28 | ~18.7% |
| Group B + customer-owned | $100.77 | ~1.31 | 18% |
| Group A, lower CF (14%) | $90.37 | ~1.21 | ~21% |

The exact numbers come from the engine. These are estimates.

The APR is fixed when the project is created and shown on its card. Every lender in that note earns the same rate. Interest starts on the day each deposit lands.

## Points (unchanged from the last revision)

The points multiplier is **2x** at 0% filled and falls steadily to **1x** at 100% filled. Points have no cash value in this version. A withdrawal before the note fills gives up points in proportion to the amount withdrawn.

## Payout order at takeout

1. Lenders: principal plus the project's APR for the actual days held
2. Creator: 3x cash plus 2x cash. The creator's reward stays at 5x.
3. Installer: base plus day-one bonus, both unchanged, plus 7% of the factored proceeds
4. HELIO: the rest. The 5% collateral is released to HELIO later by a manual admin action. The customer's monthly payments still go 100% to HELIO.

The logic that deferred the creator's cash into later tail payments is removed.

## Unchanged

The $20/kW application fee, creator reward, 2.5% withdrawal fee before the note fills (1.5% to lenders who stay, 1% to protocol), the customer's power agreement, the brand, and the /solar page.

## App changes

- **Economics:** add the REC engine (quantity, price lookup, adders, payment schedule), the factoring constants, the `aprForCoverage()` function, the points multiplier and the new payout order. The fixed $0.845/W REC figures are replaced by the engine.
- **Oracle / originate:** the form for creating a project gets inputs for AC size, capacity factor, Group, adders and the Part I and Part II estimates. It shows a live preview of the REC contract, coverage and APR, and blocks projects under 1.12 coverage.
- **Note records:** store the REC inputs, contract value, coverage, APR, factor proceeds, points and deposit timestamps. Remove the Yield NFT and tail fields.
- **Ledger:** record the factoring sale together with the takeout. Remove the actions for recording tail payments and claiming NFT cash.
- **Pages:**
  - Cards show the project's APR, coverage and the live points multiplier.
  - The underwriting table shows how the REC value was worked out and a "Factored tail" column.
  - The portfolio shows positions, the payout at takeout, and points.
  - **The market page and its nav link are retired.**
  - The docs are rewritten.
- **/welcome:** "18–24% APR, set by each roof's REC value", "$1 → ~$1.07 in 120 days", and "Up to 2x points". The auction explainer and all mentions of the six-year tail are removed.
- **Demo data and tests:** the demo is reset with a mix of scenarios so the rates vary. Tests cover the REC engine against the worked example in your spec, the APR boundaries, the minimum coverage, points and the payout order.
- **Project memory and roadmap:** updated to the factoring, rate-from-REC-value and points rules.

## Technical notes

- `aprForCoverage(c) = 0.24 − (clamp(c, 1.12, 1.30) − 1.12) / 0.18 × 0.06`
- REC engine in `src/lib/helio/rec.ts`: pure functions, plus a test against the spec's example (148 RECs × $100.77 ≈ $14,914).
- `ledger.ts` stays the single source of truth for note state changes. The Anchor program is still out of scope.
