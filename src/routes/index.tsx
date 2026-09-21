import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Flame, HandCoins, ShoppingCart, Sun } from "lucide-react";
import { UnderwritingCalculator } from "@/components/helio/Calculator";
import { ProjectCard } from "@/components/helio/ProjectCard";
import { SourcesPopover } from "@/components/helio/Sources";
import { SectionHead, Stat, usd } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { PANEL_PRICE_USDC, PANEL_WATTS_DC } from "@/lib/helio/constants";
import { distributedToShares } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HELIO — Buy a panel. Burn it into a roof. Get paid by Ameren." },
      {
        name: "description",
        content:
          "HELIO originates Illinois solar jobs and funds them with 400 W panel tokens. Burn panels into a roof, hold a Project Share, receive the Ameren rebate and Illinois Shines REC takeout in USDC.",
      },
      { property: "og:title", content: "HELIO — Buy a panel. Burn it into a roof. Get paid by Ameren." },
      { property: "og:description", content: "400 W panels at $400. Real Illinois roofs. Takeout paid by Ameren and Illinois Shines." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { icon: ShoppingCart, title: "Buy panels", body: `One Helio Panel = ${PANEL_WATTS_DC} W DC of underwriting capacity for $${PANEL_PRICE_USDC} USDC.` },
  { icon: Sun, title: "We originate", body: "HELIO underwrites real Ameren jobs at $1.00/W-DC and publishes the funding target." },
  { icon: Flame, title: "Burn into a roof", body: "Burning is permanent. You receive a Project Share equal to your panels ÷ panels required." },
  { icon: HandCoins, title: "Get paid", body: "Ameren rebate and the first Illinois Shines REC payment land in USDC and pay shares pro-rata." },
];

function Landing() {
  const { state, ready } = useHelio();
  const projects = state.projects;
  const featured = projects.find((p) => p.panelsBonded > 0 && p.panelsBonded < p.panelsRequired) ?? projects[0];
  const kwOriginated = projects.reduce((s, p) => s + p.specs.kwDc, 0);
  const takeoutPaid = projects.reduce((s, p) => s + distributedToShares(p), 0);

  return (
    <div className="space-y-16">
      <section className="grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <div className="hazard h-1.5 w-28" />
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Buy a panel.
            <br />
            Burn it into a roof.
            <br />
            <span className="text-volt">Get paid by Ameren.</span>
          </h1>
          <p className="max-w-xl text-base text-muted-foreground md:text-lg">
            HELIO originates Illinois solar jobs and funds them with 400-watt panel tokens at ${PANEL_PRICE_USDC} each. Burn your panels into a
            specific roof and hold a Project Share of that job's Ameren rebate and Illinois Shines REC contract.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="volt" size="lg">
              <Link to="/shop">Buy panels <ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/projects">See originated jobs</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-6 border-t border-border pt-6 md:grid-cols-4">
            <Stat label="Panels minted" value={ready ? state.panelsMinted : "—"} sub={`${state.shopStock} left in mint`} />
            <Stat label="Panels bonded" value={ready ? state.panelsBurned : "—"} sub="burned permanently" />
            <Stat label="kW-DC originated" value={ready ? kwOriginated.toFixed(1) : "—"} sub={`${projects.length} Ameren jobs`} />
            <Stat label="Takeout paid" value={ready ? usd(takeoutPaid) : "—"} sub="to Project Shares" accent />
          </div>
        </div>

        {featured && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="eyebrow">Featured project</div>
              <SourcesPopover />
            </div>
            <ProjectCard p={featured} />
          </div>
        )}
      </section>

      <section>
        <SectionHead eyebrow="How it works" title="Four steps, no loans" />
        <div className="grid gap-4 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="panel space-y-3 p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-8 items-center justify-center rounded-sm bg-volt/10 text-volt">
                  <s.icon className="size-4" />
                </span>
                <span className="num text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="text-base font-medium">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHead
          eyebrow="Underwriting"
          title="Project underwriting"
          right={<span className="max-w-sm text-xs text-muted-foreground">Every figure derives from the Illinois Shines 2026–27 Group A price table and the Ameren $300/kW-DC rebate.</span>}
        />
        <UnderwritingCalculator />
      </section>

      <section>
        <SectionHead eyebrow="Open jobs" title="Originated this cycle" right={<Button asChild variant="secondary" size="sm"><Link to="/projects">All projects</Link></Button>} />
        <div className="grid gap-4 md:grid-cols-2">
          {projects.slice(0, 2).map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
