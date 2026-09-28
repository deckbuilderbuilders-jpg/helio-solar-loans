# HELIO roadmap

## Done
- Splash page at /welcome (bridge-lending pitch, Dutch auction).
- Auction math module (APR floor 12% → cap 25%, 90–120 day lockup).
- Economics module: solar + battery cost/takeout, PPA, REC tail splits, creator multiplier, installer fees.
- Splash rewritten for the PPA + battery + tail-yield + creator model.

## Open
- Wire the auction, PPA and tail-yield model into the in-app pages (/projects, /project/$id, /portfolio).
- Replace the panel-burn originator model in src/lib/helio (ledger, seed, store) with notes + Yield NFTs.
- Pre-bonding deposit/withdraw flow with the 2.5% exit fee (1.5% to remaining lenders, 1.0% protocol).
- Creator origination flow charging the $20/kW application fee and issuing 3x cash + 2x yield credits.
- Installer payout flow: $0.33/W base, $0.02/W day-one bonus, 20% of the HELIO tail fee.
