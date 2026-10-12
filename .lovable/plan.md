# Bring /welcome from 6.5 to 9.5

The gap is craft, not structure. The plan keeps the page order and fixes the five things that make Nomu feel premium: show the product, physical motion, editorial typography, proof, and finish.

## 1. Show the machine (hero)
- New full-width hero visual: a cream, editorial-style picture of a solar roof with a small, quiet miner box beside the house. Generated in the brand palette, with no crypto clichés.
- Live overlay on the image, drawn as thin navy lines: sun to panel to battery to miner. Orange "energy pulses" travel along the line.
- Three small number labels pinned to the image: watts now, network TH (100), and sats mined today. The numbers tick smoothly and are clearly labeled "simulated" until real readings exist.
- The headline stays "Sunlight in. Bitcoin out.", set much larger (around 9–11vw on desktop) with tight letter spacing. Each word rises in a staggered reveal.

## 2. Make the pipeline physical
- Replace the dot on a track with one object, a "watt token", that moves Bond → Build → Power → Mine → Earn as you scroll.
- Each station changes form as the token arrives: a USDC chip becomes a panel, then a bolt, then a hash block, then a sat coin. The shapes are simple, and only the moving path is orange.
- Motion uses springs with slight overshoot and settle, instead of fixed-length timed animations.
- On phones it becomes a vertical stepper that fills as you scroll.

## 3. Bonding curve as the centerpiece
- Draw the real curve from the project's curve math as a large SVG line. A draggable marker shows "you are here", with HASH per $ shown at that point.
- The bond amount slider shades the area under the curve that you'd buy, and the totals count up as it moves.
- Show one comparison line: "Bond at 10% full: 3.1x more HASH than at 90%."

## 4. Proof and trust
- A "Network today" strip with real figures only: 100 TH online, projects, HASH supply, and the 80/20 split. These are read from the store.
- A "Where the money goes" bar: USDC to solar build to miners to 80% to holders and 20% to the DAO, with animated segment widths.
- Comparison table restyled as a strong editorial grid with check and cross marks, and a highlighted HELIO column.

## 5. Finish and polish
- Typography: one display face with character for headlines, plus the current mono for labels. Size scale tightened to 4 steps.
- Spacing: an 8-pt rhythm, full-bleed section breaks that alternate cream and navy, and hairline grid rules like Nomu.
- Micro-interactions: buttons with a magnetic hover and arrow nudge, FAQ height animations, and a custom focus ring.
- Reduced-motion users get a static version. Mobile layout is checked at 390px.
- Opening intro: shortened to 1.4s, and it hands off into the hero headline instead of fading out.

## Not doing
- No fake rooftop readings presented as real. Anything simulated is labeled.
- No changes to the app pages or the bonding math.

## Technical details
- Only `src/routes/welcome.tsx` changes. It is split into `src/components/welcome/*` (Hero, EnergyFlow, Pipeline, CurveChart, NetworkStrip, MoneyFlow, Compare, Faq).
- Motion uses `motion` (framer-motion): springs, `useScroll`/`useTransform` for the pipeline, and `useReducedMotion`.
- Curve chart is sampled from `src/lib/hash/curve.ts`. Network figures come from `useHash` store selectors.
- Hero image is generated to `src/assets/welcome-hero.jpg` (premium tier). Display font is loaded via `<link>` in `__root.tsx` and mapped in `styles.css` `@theme`.
- Verify with Playwright screenshots at 1280 and 390, plus a check of the build log.
