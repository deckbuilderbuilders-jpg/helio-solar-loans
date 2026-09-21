import { Link, createFileRoute } from "@tanstack/react-router";
import { Empty, GateChip, Pill, Progress, SectionHead, Stat, pct, usd, usdc } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { PANEL_PRICE_USDC } from "@/lib/helio/constants";
import { bondedPanels, claimable, distributedToShares, projectStatus } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — HELIO" },
      { name: "description", content: "Your unbonded Helio panels, Project Shares on Ameren Illinois roofs, and USDC claimed from rebate and REC takeout." },
      { property: "og:title", content: "Portfolio — HELIO" },
      { property: "og:description", content: "Panels, Project Shares and claimed USDC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  const { state, wallet, balance, panels, claim } = useHelio();

  if (!wallet) {
    return (
      <Empty
        title="No wallet connected"
        body="Use “Load demo wallet” in the header to connect the seeded investor wallet — it already holds unbonded panels and a share of the Springfield job."
      />
    );
  }

  const positions = state.projects
    .map((p) => ({ p, mine: bondedPanels(state, p.id, wallet) }))
    .filter((x) => x.mine > 0)
    .map((x) => ({ ...x, claimable: claimable(state, x.p, wallet), claimed: x.p.claims[wallet] ?? 0 }));

  const totalClaimed = positions.reduce((s, x) => s + x.claimed, 0);
  const totalClaimable = positions.reduce((s, x) => s + x.claimable, 0);
  const committed = positions.reduce((s, x) => s + x.mine * PANEL_PRICE_USDC, 0);

  return (
    <div className="space-y-8">
      <SectionHead
        eyebrow="Position"
        title="Your portfolio"
        right={
          <div className="flex flex-wrap gap-6">
            <Stat label="USDC" value={usdc(balance, 0)} sub="wallet balance" />
            <Stat label="Unbonded panels" value={panels} sub={`${usd(panels * PANEL_PRICE_USDC)} at mint`} />
            <Stat label="Bonded capital" value={usd(committed)} sub={`${positions.length} job${positions.length === 1 ? "" : "s"}`} />
            <Stat label="Claimed" value={usd(totalClaimed)} sub={`${usd(totalClaimable)} claimable`} accent />
          </div>
        }
      />

      <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="eyebrow">Unbonded panels</div>
          <div className="num mt-1 text-3xl font-medium">{panels}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Panels earn nothing until they are burned into a roof. Pick a job that is still bonding.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="secondary">
            <Link to="/shop">Buy more panels</Link>
          </Button>
          <Button asChild variant="volt">
            <Link to="/projects">Bond into a job</Link>
          </Button>
        </div>
      </div>

      <div>
        <SectionHead eyebrow="Project Shares" title="Bonded positions" />
        {positions.length === 0 ? (
          <Empty
            title="No Project Shares yet"
            body="Burn panels into an originated job to mint a Project Share and start receiving Ameren rebate and Illinois Shines REC payments."
            cta={
              <Button asChild variant="volt">
                <Link to="/projects">Browse projects</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {positions.map(({ p, mine, claimable: c, claimed }) => {
              const sharePct = mine / p.panelsRequired;
              return (
                <div key={p.id} className="panel grid gap-4 p-5 md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))_auto] md:items-center">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <GateChip gate={p.gate} />
                      <Pill state={projectStatus(p)} />
                    </div>
                    <Link to="/project/$id" params={{ id: p.id }} className="block truncate font-medium hover:text-volt">
                      {p.name}
                    </Link>
                    <Progress value={p.panelsBonded} total={p.panelsRequired} />
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {p.city} · {p.specs.kwDc} kW-DC · {p.panelsBonded}/{p.panelsRequired} bonded
                    </div>
                  </div>
                  <Stat label="Your panels" value={mine} sub={pct(sharePct, 2)} />
                  <Stat label="Takeout attributable" value={usd(p.takeout.takeout * sharePct)} sub={`${usd(distributedToShares(p) * sharePct)} distributed`} />
                  <Stat label="Claimed" value={usd(claimed)} sub={`${usd(c)} claimable`} accent={c > 0} />
                  <Button variant="volt" size="sm" disabled={c <= 0.000001} onClick={() => claim(p.id)}>
                    Claim
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
