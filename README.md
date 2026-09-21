# HELIO

**Buy a panel. Burn it into a roof. Get paid by Ameren.**

HELIO is a solar **originator platform** on Solana. HELIO underwrites real Ameren Illinois solar
jobs, publishes each one at a funding target of **$1.00 per watt-DC**, and lets panel holders fund
the specific roof they choose.

There is no lending, no interest, no order book and no liquidation anywhere in the protocol.

## The loop

1. **Buy panels.** One Helio Panel = 400 W DC of underwriting capacity = **$400 USDC**.
2. **HELIO originates.** Funding target = kW-DC × $1.00. Panels required = `ceil(kW_DC × 1000 / 400)`.
3. **Burn into a roof.** Burning is permanent and mints a **Project Share** equal to
   `panels_burned / panels_required`.
4. **Get paid.** Once fully bonded the job is Funded. Ameren rebate and the first Illinois Shines
   REC payment arrive in USDC and pay shares pro-rata. The 6-year REC tail splits **80% to shares,
   20% to HELIO** as the originator fee.

## Takeout math

```
takeout = ameren_solar_rebate          (kW-DC × $300, DS-1 / DS-2)
        + ameren_battery_rebate        ($300/kWh, paired storage only)
        + first_rec_payment            (50% Small DG ≤25 kW AC, 15% Large DG)
        − 5%  rec_contract_collateral
        − 3%  protocol_haircut_reserve
```

REC engine (computed, never hardcoded): nameplate = kW AC, capacity factor 16.42%, 8,760 h,
15-year term, 0.5% annual degradation, whole RECs rounded down. Illinois Shines 2026–27 Group A
Distributed Generation prices with stacked adders: customer-owned Small DG +$20/REC (no federal
ITC), Equity Eligible Contractor +$5/REC.

Flagship seeded job — 10.00 kW AC / 12.00 kW-DC, customer-owned, EEC, Ameren DS-1:

| Item | Value |
| --- | --- |
| Funding target / install cost | $12,000 (30 panels × $400) |
| Effective REC price | $95.37 ($70.37 + $20 + $5) |
| 15-year RECs | 208 |
| REC purchase amount | $19,837 |
| First REC payment (50%) | $9,918 |
| Ameren rebate | $3,600 |
| **Takeout to Project Shares** | **≈ $12,150** |
| 6-year REC tail (24 quarters) | $9,918 → $7,935 to shares |

Electing the Ameren generation rebate moves the site to **supply + transmission-only** net
metering; HELIO never models bill savings at full retail.

## Milestones (oracle-written)

`G0` Sale/Disclosure signed · `G1` Part I verified · `G2` ICC Trade Date · `G3` PTO + rebate filed ·
`G4` Ameren rebate received · `G5` Part II / Schedule B · `G6` first REC payment received ·
`G7` takeout distributed to Project Shares.

## App

| Route | Purpose |
| --- | --- |
| `/` | Hero, four steps, featured job, protocol stats, underwriting calculator |
| `/shop` | Mint 1 / 5 / 30 Helio 400 W panels |
| `/projects` | Every originated job with location, kW, panels bonded, raised vs takeout |
| `/project/$id` | Full underwrite, bond modal, milestones, holders, payouts, claims |
| `/portfolio` | Unbonded panels, Project Shares, claimable and claimed USDC |
| `/originate` | Admin desk: underwrite and publish a job |
| `/oracle` | Admin console: advance gates, inject rebate / REC / tail USDC |
| `/docs` | Protocol reference and Illinois sources |

## Repository

```
src/lib/helio/        takeout engine, panel math, pure ledger, seed, provider  (mirrors the program)
src/components/helio/ shell, calculator, project card, gate timeline, sources
src/routes/           the pages above
programs/helio/       Anchor program: buy_panels, originate_project, bond_panels,
                      admin_set_gate, record_takeout_payment, claim
```

The web app runs the ledger in TypeScript so the demo is deterministic and never depends on
Illinois servers or a validator. `programs/helio/src/lib.rs` is the on-chain equivalent: same
instructions, same u64 micro-USDC math, Token-2022 panels burned on bond.

```bash
bun install
bun run dev        # http://localhost:8080
bunx vitest run    # takeout + ledger tests
```

## Sources

- Illinois Shines / Adjustable Block Program **2026–27 Program Guidebook** — Group A DG REC prices
  and adders.
- Illinois Shines 2026–27 REC contract terms — 15-year delivery, 50% Small DG / 15% Large DG first
  payment, remainder over 24 quarters.
- Ameren Illinois distributed generation rebate tariff — $300/kW-DC (DS-1, DS-2), $300/kWh paired
  storage, ~60 days after PTO.
- Ameren Illinois net metering for rebate-electing customers — supply + transmission credit only.

Devnet demonstration. Not an offer of securities and not a guarantee of program payments.
