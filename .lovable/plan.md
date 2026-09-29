# /welcome copy updates: new headline + $1 terminal value in the tail sections

## 1. New hero headline and subheadline
In `src/routes/welcome.tsx`, replace the hero copy:

- H1: **Fund Solar. Earn Yield** ("Earn Yield" keeps the orange accent)
- Subheadline: "Utility company returns your principal in 120 days. You keep a tradable Yield NFT paying quarterly for six years."
- Align the page `<title>` and meta/OG descriptions with the new framing (drop the old "Lend $1. Get $1 back." wording).

## 2. Tail yield: show the end-of-contract value of $1, not an annual %
Replace every "per year" tail-yield figure on /welcome with the total value $1 reaches by the end of the 24 REC quarters (six years).

Math: the Yield NFT streams 65% of the REC tail for 24 quarters. Per $1 of note principal that totals about $0.20 of cumulative NFT cash on the 10 kW flagship, so $1 lent is worth **$1.20** once the final REC quarter pays (principal back at takeout plus the NFT payout).

Changes in `src/lib/helio/economics.ts`:
- Add `yieldNftTotalPerDollar(e)`: `(tailToYieldAnnual * TAIL_QUARTERS / 4) / buildCost` — cumulative NFT cash per $1 lent by quarter 24. Existing `yieldNftAnnualRate` stays for other pages.

Changes in `src/routes/welcome.tsx`:
- Hero stat row: replace "3.3% — Tail yield, per year" with "$1.20 — Value of $1 lent, end of the six-year tail".
- "Leg two · The tail" card: replace the "$X/yr per 10 kW roof · 3.3% a year on capital lent" line with the terminal-value line, e.g. "$1 lent is worth $1.20 once the 24th REC quarter pays."
- Auction explainer footnote: replace "about $33 a year per $1,000 lent" with "worth about $1.20 per $1 by the end of the tail."

## Scope
- `src/routes/welcome.tsx` and one helper in `src/lib/helio/economics.ts`. No other pages, components, or logic change.

## Verification
- Check the build log for errors.
- Load /welcome in the browser (desktop and mobile) and confirm the new headline, subheadline, and $1 → $1.20 tail figures render.
