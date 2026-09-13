# HELIO

**24% APY. 60 days. Paid by the utility.**
Sharky-style fixed-term USDC loans for Illinois solar Approved Vendors, collateralised by the cash they are already owed: the Ameren Illinois rebate and the first Illinois Shines REC payment. Solana devnet. No oracle price liquidations.

```
pnpm seed      # demo-ready chain state (4 collections, 8 offers, 6 notes, 1 defaulted, 1 repaid)
anchor test    # program tests: post → accept → repay, post → accept → expire → foreclose
pnpm dev       # http://localhost:8080
```

> This repository's UI runs on TanStack Start. The Anchor program ships as source in `programs/helio`; the same state machine is mirrored 1:1 in `src/lib/helio/ledger.ts` and exercised by `bunx vitest run` (takeout math + waterfall). The web app runs against that ledger with seeded, deterministic state and advertised demo keypairs so the demo works on first click with no validator.

## problemStatement

An Illinois Approved Vendor sells a 10 kW customer-owned array, installs it at ~$1.00/W-DC, and is owed $12,000 the day the utility grants Permission to Operate. The money that pays for it arrives late and in pieces: the Ameren $300/kW-DC rebate ~60 days after PTO, and — since the 2026–27 program year — only **50%** of the 15-year REC contract at Part II, with the rest ratably over 24 quarters. Sale-to-first-REC-check is 5–10 months. AVs finance that hole with progress-billing factoring at 2–5% per 30 days or stop selling.

## technicalApproach

- **Collection order book** (`A-SDG-10`, `A-SDG-10-ESS`, `A-SDG-25`, `A-LDG`): lenders post USDC offers with APY / term / minimum gate; USDC sits in an offer vault.
- **Project Note**: a Token-2022 mint per project, held in the AV's wallet, with the program as freeze authority. `accept_offer` freezes it in place (escrow-less); `repay` thaws; `foreclose` transfers it to the lender. Foreclosure delivers the *claim* on the rebate + first REC invoice, not the panels.
- **Milestone gates** G0–G7 written by a tiny oracle (`admin_set_gate`). Loans originate only at G2 (ICC Trade Date), G3 (PTO + rebate filed) or G4 (Part II / first invoice window). LTV cap = min(collection cap, gate grid 70/80/88%).
- **Takeout engine** (`src/lib/helio/takeout.ts`, mirrored in Rust): REC quantity (16.42% CF, 15 yr, 0.5%/yr degradation), Group A price tiers + $20 customer-owned + $5 EEC adders, 50%/15% first payment, 5% collateral lock, 3% haircut, $300/kW-DC + $300/kWh Ameren rebate.
- **Escrow waterfall** in `repay`: incoming takeout USDC → principal → interest net of 10% protocol fee → residual to the AV. Partial prepay allowed. One 30-day extension at +6% APY, then foreclose after expiry + 72h grace.
- Interest is fixed-term simple interest computed in u64 micro-USDC: `principal × apy_bps × elapsed / (10_000 × 365 × 86_400)`.

## targetAudience

**Borrowers:** Illinois Approved Vendors (installers) who need PTO-day liquidity against contracted, tariffed cash.
**Lenders:** stablecoin credit funds and DeFi LPs tired of 3–8% on idle USDC who want short-duration paper where the debtor is a utility and a state program, not a token price.

## businessModel

10% of interest (lender net on the 24% book is 21.6%) plus 1–2% origination to the treasury. The AV keeps the residual and the entire 6-year REC tail (~$9,900 on the flagship 10 kW) — so they come back for the next project instead of selling the tail to a factor.

## competitiveLandscape

| | Why not |
|---|---|
| Sharky / NFT lending | Right mechanics (fixed term, no oracle), wrong collateral (JPEG floors) |
| Maple / Goldfinch / Huma / Credix | Generic private credit, 8–18%, no Illinois takeout engine, months to onboard a borrower |
| Kamino / Jupiter / Save | Idle USDC at 3–8% |
| Construction / progress-billing factoring | 2–5% per 30 days (24–60% APR), 30-day wires, and the factor takes the REC tail |

## futureVision

- EEC advance-of-capital collection (Illinois Shines' own pre-funding for Equity Eligible Contractors).
- ComEd (Group B) book with its own rebate + REC tiers.
- Tokenised 24-quarter REC tail as a separate, longer note.
- Servicer AV network so a foreclosed note can be completed by another vendor.
- Idle offer-vault USDC parked in Kamino between fills (display-only in v1).

## Flagship numbers (asserted in `src/lib/helio/takeout.test.ts`)

10.00 kW AC / 12.00 kW DC, customer-owned, EEC, no battery, Ameren DS-1:
$95.37/REC · 14.38 year-1 RECs · 208 contract RECs · $19,837 REC contract · $9,918 first REC payment · $992 collateral · $3,600 rebate · **$12,150 takeout** · **$9,720 loan at 80% LTV** · 60-day interest at 24% ≈ $383 · AV clears ≈ $2,000 after repay and keeps the ~$9,918 tail. Adding a 13.5 kWh battery adds $4,050 to the takeout.

## Layout

```
programs/helio/          Anchor 0.30 program (lib.rs, tests/helio.ts)
src/lib/helio/           constants · takeout engine · ledger state machine · seed · store
src/components/helio/    Shell, Calculator, GateTimeline, OfferTable, WhyYield, Sources
src/routes/              /  /lend  /borrow  /project/$id  /loan/$id  /oracle  /docs
SPEC.md  DEMO.md
```

Demo wallets are listed on `/docs`. Everything is devnet; nothing here is an offer of securities.
