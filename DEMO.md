# HELIO — 3-minute demo script

Before recording: `pnpm seed && pnpm dev`, open `/`, wallet disconnected. Reset demo from the wallet menu if state is dirty.

**0:00 — Problem** (landing hero)
"An Illinois installer sells a 10 kW array at a dollar a watt. Twelve thousand dollars are due the day the utility turns it on. The Ameren rebate lands sixty days later. Since 2026 the REC contract pays only half up front, months after that. That's a five-to-ten-month cash hole, and today it's filled with factoring at two to five percent a month."

**0:25 — Calculator** (scroll to Takeout engine)
Type 10 kW AC / 12 kW DC. Flip *Customer-owned* and *EEC* off then on: "$70.37 plus $20 plus $5 — $95.37 a REC, 208 RECs, a $19.8k contract, half of it at Part II." Point at the three tiles: "$12k install, ~$12.1k contracted takeout, and a 60-day loan of $9,720 at 24% today." Click *Why this yield*: "That's 4–7× Kamino, above Maple, and cheaper than the factor."

**0:50 — Lend** (`/lend`, Connect → Load demo lender)
Click A-SDG-10. *Post offer*: $5,000, G3 grid pre-fills 24% / 60d / 1.5%. Deposit & post. "USDC is now in the offer vault. Fixed term, no oracle, no liquidation."

**1:10 — Borrow** (`/borrow`, Connect → Load demo AV)
Select *Oakland Ave — Decatur* (G3, no loan). Best offers table shows the book sorted by APY; click *Accept best*. Loan page opens: "Principal landed in the AV wallet minus origination. The Project Note didn't move — it's frozen in the AV's wallet with the program as freeze authority."

**1:30 — Oracle** (`/oracle`, Load oracle admin)
Select the same project. Punch **G4**. Click *Ameren rebate arrives → G5* ($3,600 into escrow). Click *First REC payment arrives → G6* (~$9,400). "Nothing here depends on Illinois servers — in production a small server signs these two instructions."

**1:50 — Waterfall** (click *Switch to AV & run waterfall*, land on `/loan/…`)
"Escrow → principal back to the lender → interest, net of a 10% protocol fee → residual back to the AV. Note thawed, project at G7." Open `/project/…`: "And the AV keeps the six-year REC tail. We never lent against it."

**2:10 — Foreclose** (`/lend`, Load demo lender)
Route 51 Ag Barn is red: expired six days ago, past the 72-hour grace. Click *Foreclose*. "The lender receives the Project Note — the claim on the rebate and the REC invoice — plus whatever was in escrow. Not the panels."

**2:30 — Why Solana, why a company**
"Every step you just saw settles in a slot. Factoring settles in 30-day wires. The whole book is three account types and twelve instructions; the note is plain Token-2022 so any wallet can read 'frozen' as 'encumbered'. We take 10% of interest and 1–2% origination; the AV keeps the tail and comes back next project. Illinois alone approves ~1 GW of small DG a year — that's a $300M+ annual takeout float."

**2:50 — Ask**
"We're looking for the first $2M of USDC on the G3 book and three Approved Vendors for a mainnet pilot in the 2026–27 program year."
