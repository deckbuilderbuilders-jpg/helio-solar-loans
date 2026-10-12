# AGENTS
- /welcome splash renders outside the Shell (switched in __root by pathname); first visit to / redirects there once via localStorage "helio.welcomed". Why: splash stays standalone.
- src/lib/hash/curve.ts is the only place bonding-curve math lives (pump.fun constant product scaled per project). Why: one engine to port on-chain.
- src/lib/hash/store.tsx holds all state transitions (bond, unbond, go live, mine, claim) in localStorage. Why: pages stay thin; simple devnet simulation.
- Keep the app minimal: Projects, Project, My HASH, Welcome. Why: user wants maximum simplicity.
