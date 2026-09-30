import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Coins, Gavel, Hammer, Sprout } from "lucide-react";
import { EconomicsCalculator } from "@/components/helio/Economics";
import { NoteCard } from "@/components/helio/ProjectCard";
import { SectionHead, Stat, usd } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { econOf } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HELIO — Bridge Illinois solar roofs for 90 days" },
      { name: "description", content: "Fund fixed-term USDC bridge notes on Illinois solar roofs at 18–24% APR, set by each roof's REC value. Repaid in 90–120 days by Ameren rebates, the first Illinois Shines REC payment and the factored REC tail." },
      { property: "og:title", content: "HELIO — Bridge Illinois solar roofs for 90 days" },
      { property: "og:description", content: "18–24% APR bridge notes, repaid in 90–120 days. Early lenders earn up to 2x points." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { icon: Sprout, title: "Create", body: "Anyone opens a roof by paying the $20/kW application fee. It's the only money at risk. Import the Illinois Shines application; the note is priced from its REC value. Pays back 5x cash." },
  { icon: Gavel, title: "Fund", body: "Each note has one fixed APR, 18–24%, from its REC coverage. Early dollars earn 2x points, falling to 1x at fill. Exit before it fills for a 2.5% fee." },
  { icon: Hammer, title: "Build", body: "Installer earns $0.33/W, plus $0.02/W for a one-day install. Customer gets solar + storage and a 50% smaller bill." },
  { icon: Coins, title: "Repay", body: "Day 90–120: Ameren rebates, the first REC check and the REC tail sold at 65% of face repay principal + interest in one payment." },
];

function Landing() {
  const { state, ready, now } = useHelio();
  const notes = state.notes;
  const live = notes.filter((n) => n.stage === 1 && !n.failed);
  const featured = live[0] ?? notes[0];
  const kw = notes.reduce((s, n) => s + n.kwDc, 0);
  const repaid = notes.reduce((s, n) => s + n.lendersRepaid, 0);
  const factored = notes.reduce((s, n) => s + n.factorProceeds, 0);

  return (
    <div className="space-y-16">
      <section className="grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <div className="hazard h-1.5 w-28" />
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Fund the Future.
            <br />
            <span className="text-volt">Earn Yield.</span>
          </h1>
          <p className="max-w-xl text-base text-muted-foreground md:text-lg">
            Lend USDC into a solar project. The utility companies repay you in 90–120 days. Earn 18–24% APR.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="volt" size="lg">
              <Link to="/projects">Open notes <ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/originate">Import an application</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-6 border-t border-border pt-6 md:grid-cols-4">
            <Stat label="Filling now" value={ready ? live.length : "—"} sub={`${notes.length} notes total`} />
            <Stat label="kW-DC created" value={ready ? kw.toFixed(0) : "—"} sub="solar + storage" />
            <Stat label="Lenders repaid" value={ready ? usd(repaid) : "—"} sub="principal + interest" />
            <Stat label="REC tail factored" value={ready ? usd(factored) : "—"} sub="sold at 65% of face" accent />
          </div>
        </div>
        {featured && (
          <div className="space-y-3">
            <div className="eyebrow">Featured note · {usd(econOf(featured).buildCost)}</div>
            <NoteCard n={featured} now={now} />
          </div>
        )}
      </section>

      <section>
        <SectionHead eyebrow="How it works" title="One roof, one note" />
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
        <SectionHead eyebrow="Underwriting" title="Price a roof" right={<span className="max-w-sm text-xs text-muted-foreground">$1.15/W solar, $250/kWh storage, 6.4 kWh per kW. Repaid by fixed Ameren rebates, the first REC payment and the factored REC tail. APR follows coverage.</span>} />
        <EconomicsCalculator />
      </section>
    </div>
  );
}
