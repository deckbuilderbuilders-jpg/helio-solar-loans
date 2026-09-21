# HELIO — 3-minute demo script

Reset first: header wallet menu → **Reset demo state**. Seed leaves 500-panel mint (374 left),
4 originated jobs, Springfield at 17/30, one funded job awaiting PTO, one paid-out job, and a demo
wallet holding 8 unbonded panels plus shares on Springfield and Charleston.

**0:00 — The pitch (`/`)**
"Buy a panel. Burn it into a roof. Get paid by Ameren." One panel is 400 watts DC for $400. HELIO
originates real Ameren Illinois jobs at a dollar a watt. Point at the live stats: panels minted,
panels bonded, kW-DC originated, takeout paid.

**0:25 — Underwriting is real (`/` calculator)**
Toggle **customer-owned** and **EEC**. REC price moves $70.37 → $95.37, takeout moves, panels needed
stay 30 for a 12 kW-DC array. Open **Sources**: Illinois Shines 2026–27 Group A table, the 50%
first-payment split, the Ameren $300/kW-DC rebate and its 60-day clock.

**0:50 — Buy panels (`/shop`)**
Header → **Load demo wallet (panel holder)**. Buy the 5-pack. Stock drops, wallet USDC drops,
panel count in the header goes up.

**1:10 — Burn into a roof (`/project/job-001`, Prairie Ave — Springfield)**
Walk the takeout build-up: $3,600 Ameren rebate + $9,918 first REC payment − 5% collateral − 3%
reserve = **$12,150 takeout**, $405 per panel plus $264 of tail. Click **Burn panels in**, burn 5.
17/30 becomes 22/30. Say the line: burning is permanent, the share is the claim.

**1:40 — Fund it out and energize (`/oracle`)**
Header → **Load originator admin**. On the fully bonded Decatur job: advance **G3 → PTO + rebate
filed**, then **Inject Ameren rebate** and **Inject first REC payment**. Each write shows the exact
memo — kW-DC × $300, and RECs × $95.37 net of collateral and reserve.

**2:15 — Get paid (`/portfolio`)**
Back to the demo wallet. Bonded positions show panels, share percent, takeout attributable and
claimable USDC. Click **Claim** on the paid-out Charleston job — USDC lands in the wallet.

**2:40 — Close (`/docs`)**
The takeout is a tariffed utility rebate plus a state REC invoice, not a floor price. No lending, no
liquidations, no oracle prices. Holders take the 80% REC tail; HELIO keeps 20% for originating.

**Fallbacks**
- Anything looks stale → **Reset demo state**.
- Payment buttons disabled → the job is not fully bonded yet; bond the remaining panels first.
