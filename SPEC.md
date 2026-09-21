# HELIO — protocol spec

## Units

- USDC: u64 micro-USDC (6 decimals) on-chain; floats in the UI layer only.
- Panel: Token-2022 fungible token. 1 panel = 400 W DC = $400 USDC.
- kW values stored on-chain as milli-kW (i.e. watts) to stay integral.

## Accounts

| Account | Fields |
| --- | --- |
| `Config` (PDA `["config"]`) | admin, treasury, usdc_mint, panel_mint, originator_tail_bps, shop_stock, panels_minted, panels_burned |
| `Project` (PDA `["project", slug]`) | specs (kw_ac, kw_dc, battery_kwh), funding_target, panels_required, panels_bonded, takeout, rec_tail, distributed_to_shares, originator_earned, trade_date, energization_deadline, gate |
| `Share` (PDA `["share", project, holder]`) | project, holder, panels, claimed |
| Project vault (PDA `["vault", project]`) | USDC token account holding takeout awaiting claims |

## Instructions

| Instruction | Signer | Effect |
| --- | --- | --- |
| `initialize` | admin | writes Config |
| `stock_panels` | admin | adds panels to the mint cycle |
| `buy_panels` | buyer | USDC → treasury, panels minted to buyer |
| `originate_project` | admin | derives funding target and panels required, publishes the job at G2 |
| `bond_panels` | holder | burns panels permanently, increments `Share.panels` and `panels_bonded` |
| `admin_set_gate` | admin | writes a milestone; gates above G2 require a fully bonded job |
| `record_takeout_payment` | admin | USDC → project vault; kind 2 (tail) splits 20% to treasury |
| `claim` | holder | pays `distributed × panels / panels_required − claimed` |

## Derivations

```
funding_target  = kw_dc × 1000 × $1.00
panels_required = ceil(kw_dc × 1000 / 400)
share           = panels_burned / panels_required
entitled        = distributed_to_shares × panels / panels_required
claimable       = entitled − claimed
tail_to_shares  = rec_tail × (10_000 − originator_tail_bps) / 10_000
```

## Takeout engine

```
tier price      = Illinois Shines 2026–27 Group A DG table, selected by kW AC
effective price = tier + $20 (customer-owned Small DG) + $5 (EEC)
year1 RECs      = kW_ac × 0.1642 × 8.760
total RECs      = floor(Σ_{t=0..14} year1 × 0.995^t)
rec purchase    = total RECs × effective price
first payment   = 50% (≤25 kW AC) or 15% (>25 kW AC) of rec purchase
rec tail        = rec purchase − first payment   (24 quarterly payments)
takeout         = (rebates + first payment − 5% collateral) × 0.97
```

## Gates

`G0` Sale/Disclosure signed → `G1` Part I verified → `G2` ICC Trade Date → `G3` PTO + rebate filed →
`G4` Ameren rebate received → `G5` Part II / Schedule B → `G6` first REC payment received →
`G7` takeout distributed.

## Invariants

- Bonding never exceeds `panels_required`; burns are irreversible.
- No takeout may be distributed before a job is fully bonded.
- `Σ claimed ≤ distributed_to_shares`, and claims are pure functions of share size.
- No interest, no liquidation, no price oracle, no lender or borrower role exists.
