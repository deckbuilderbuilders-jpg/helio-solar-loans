# Restyle the /welcome splash in the Nomu style

Keep HELIO's content and numbers. Only the splash page changes; the app stays as it is.

## Sections (top to bottom)
1. **Top bar** — HELIO wordmark on the left, small "Early access · Solana devnet" pill, "Enter app" button on the right.
2. **Hero on a grid** — full-width cream background with a faint blueprint grid (like Nomu's). Big bold headline "From panel, to paid roof.", short line under it, the "5 panels into the Springfield roof" input with an orange "Buy a panel" button, and a "Backed by real Illinois roofs" line.
3. **Logo ticker** — endless scrolling strip: Ameren Illinois · Illinois Shines · Solana · USDC · ICC · Group A RECs.
4. **Pipeline** — the existing 5-step panel animation, restyled as numbered orange-outlined cards on the grid.
5. **Stat counters** — numbers count up when scrolled into view: $400 per panel, $300/kW-DC rebate, $95.37/REC, ~$12,150 Springfield takeout.
6. **Orange feature block** (the Nomu BP26-style section) — solid orange band: "Springfield is 17/30 bonded." with a progress bar and "See the roof" button.
7. **"Oh yeah, and all this too." grid** — 6 small cards: no loans, no liquidations, permanent burn, pro-rata shares, 80/20 REC tail, every dollar sourced.
8. **Footer** — dark navy band with wordmark and links.

## Design
- Colors: cream #FFF9F6, navy #0F151D, orange #FF7448 (already set up for this page).
- Type: heavy tight display headlines, mono small labels.
- Images: one generated photo of panels on an Illinois home roof, framed in the hero; no stock clutter.
- Motion: scroll-reveal fade-up on sections, looping ticker, count-up stats, panel travel along the pipeline. All disabled for reduced-motion users.

## Technical details
- Single file rewrite of `src/routes/welcome.tsx`; keep first-visit localStorage flag and head metadata.
- Grid background via CSS gradients; ticker and reveals via scoped keyframes + IntersectionObserver.
- Generated image saved to `src/assets/welcome-roof.jpg`.
