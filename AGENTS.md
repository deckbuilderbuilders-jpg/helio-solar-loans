# AGENTS
- /welcome splash renders outside the Shell (switched in __root by pathname); first visit to / redirects there once via localStorage "helio.welcomed". Why: splash stays standalone.
- src/lib/hash/curve.ts is the only place bonding-curve math lives (pump.fun constant product scaled per project). Why: one engine to port on-chain.
- src/lib/hash/store.tsx holds all state transitions (bond, unbond, go live, mine, claim) in localStorage. Why: pages stay thin; simple devnet simulation.
- Keep the app minimal: Projects, Project, Marketplace, My HASH, Welcome. Why: user wants maximum simplicity.
- ASIC catalog lives in src/lib/hash/asics.ts; ASIC group curves reuse curve.ts with raise = price + deploy fee. Why: one curve engine for projects and miners.
- Welcome-only styling lives under .welcome-page in global CSS and welcome components; keep it scoped so redesigns do not alter app screens.
- Welcome process progress follows native scrolling through a sticky section; reduced-motion renders all steps statically. Why: sequential storytelling without trapping wheel, touch, or keyboard navigation.
