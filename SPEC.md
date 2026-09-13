# HELIO v1 — protocol spec

## Constants (program year 2026–27, now = September 2026)

| Item | Value | Source |
|---|---|---|
| Install cost | $1.00 / W-DC | assumption |
| Ameren solar rebate | $300 / kW-DC, DS-1 / DS-2 | Ameren IL smart-inverter rebate |
| Ameren battery rebate | $300 / kWh, only paired with qualifying solar | same |
| Rebate clock | ~60 days post-PTO application | same |
| Net metering after rebate | supply + transmission only (disclosed on card) | same |
| Group A DG REC price | $70.37 (0–10 kW AC) · $60.92 (>10–25) · $59.53 (>25–100) · $55.63 (>100–200) · $45.64 (>200–500) · $42.37 (>500–2000) · $31.96 (>2000–5000) | IL Shines 2026–27 Guidebook |
| Adders | +$20 customer-owned Small DG (no ITC) · +$5 EEC | same |
| REC quantity | kW AC × 0.1642 × 8760 h, 15 yr, 0.5 %/yr degradation, floor | same |
| REC payment | Small DG (≤25 kW AC) 50 % at Part II; Large DG 15 %; remainder over 24 quarters | same |
| Collateral | 5 % of REC Purchase Amount | same |
| Protocol haircut | 3 % of gross takeout | HELIO |
| Protocol fee | 10 % of interest; origination to treasury | HELIO |
| Grace | 72 h after expiry | HELIO |
| Extension | once, +30 d, +600 bps | HELIO |

## Takeout

```
takeout  = (rebate_solar + rebate_batt + first_rec − 0.05 × rec_amount) × 0.97
lendable = takeout × min(collection.ltv_bps, gate_ltv_bps[G2 7000 | G3 8000 | G4 8800]) / 10_000
```

## Accounts

- **Config** — admin, usdc_mint, fee_bps, treasury, treasury_balance
- **Collection** — slug, gate_min, ltv_bps, default_apy_bps, term_seconds, spec filter (min/max kW AC, requires_battery)
- **Offer** — lender, collection, principal, apy_bps, origination_bps, term_seconds, min_gate, expiry, state Open|Taken|Cancelled, vault
- **Project** — borrower, collection, specs (kw_ac ×100, kw_dc ×100, battery_kwh ×10, customer_owned, eec), cached takeout, gate, note_mint, active_loan
- **Loan** — offer, project, lender, borrower, principal, apy_bps, origination_paid, start, expiry, extended, state Active|Extended|Repaid|Defaulted|Foreclosed, escrow, principal_repaid, interest_paid, protocol_cut_paid, residual

## Instructions

| ix | signer | checks | effect |
|---|---|---|---|
| initialize | admin | — | Config |
| create_collection | admin | — | Collection |
| post_offer | lender | principal > 0 | USDC → offer vault |
| cancel_offer | lender | Open | vault → lender |
| list_project | AV | specs valid, collection match | mint note to AV (program = freeze auth), cache takeout |
| accept_offer | AV | Open, collection match, gate ≥ min_gate, gate ∈ {2,3,4}, principal ≤ lendable, note not frozen | freeze note; principal − origination → AV; origination → treasury; Loan |
| admin_set_gate | admin | gate ≠ 7 | project.gate |
| record_takeout_payment | anyone | loan open, amount > 0 | USDC → escrow; rebate ⇒ G5, rec ⇒ G6 |
| repay | AV | loan open | waterfall; if fully covered: thaw, G7, Repaid |
| extend | AV | Active, before grace end | +30 d, Extended |
| foreclose | lender | open, now > expiry + 72 h | note → lender, escrow → lender, Foreclosed |
| claim_fees | admin | — | treasury sweep |

## Interest

`interest = principal × apy_bps × elapsed_seconds / (10_000 × 365 × 86_400)` in u64 micro-USDC. Term interest is owed in full regardless of early repayment (Sharky semantics). Extension adds `principal × (apy_bps + 600) × 30 d`.

## Waterfall (`repay`)

1. incoming USDC (escrow + optional wallet top-up) 2. principal → lender 3. interest → lender, 10 % → treasury 4. origination already taken 5. residual → borrower. Partial prepay leaves the loan open.

## Gates

G0 Sale/Disclosure · G1 Part I verified · **G2 ICC Trade Date** · **G3 PTO + rebate filed** · **G4 Part II / Schedule B / invoice window** · G5 rebate received · G6 first REC payment · G7 repaid. Bold = originatable.

## Not in v1

Money market, emissions, IPA scraping, homeowner loans, REC-tail streaming, multi-chain, mobile-native, DAO.
