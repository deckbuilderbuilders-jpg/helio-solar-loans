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
      { name: "description", content: "Fund fixed-term USDC bridge notes against Ameren rebates and Illinois Shines REC payments. APR climbs 12% to 25% until each roof fills, then Yield NFTs stream the REC tail." },
      { property: "og:title", content: "HELIO — Bridge Illinois solar roofs for 90 days" },
      { property: "og:description", content: "Reverse Dutch auction bridge notes, repaid by Ameren and Illinois Shines. Yield NFTs stream the tail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { icon: Sprout, title: "Create", body: "Anyone opens a roof by paying the $20/kW application fee. It's the only money at risk. Pays back 3x cash + 2x Yield NFT." },
  { icon: Gavel, title: "Auction", body: "APR starts at 12% and climbs to a 25% cap until the build is funded. Exit before it fills for a 2.5% fee." },
  { icon: Hammer, title: "Build", body: "Installer earns $0.33/W, plus $0.02/W for a one-day install. Customer gets solar + storage and a 50% smaller bill." },
  { icon: Coins, title: "Repay + tail", body: "Day 90–120: Ameren rebates and the first REC check repay principal + interest. Then Yield NFTs stream 65% of the REC tail." },
];

function Landing() {
  const { state, ready, now } = useHelio();
  const notes = state.notes;
  const live = notes.filter((n) => n.stage === 1 && !n.failed);
  const featured = live[0] ?? notes[0];
  const kw = notes.reduce((s, n) => s + n.kwDc, 0);
  const repaid = notes.reduce((s, n) => s + n.lendersRepaid, 0);
  const tail = notes.reduce((s, n) => s + n.tailReceived, 0);

  return (
    <div className="space-y-16">
      <section className="grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <div className="hazard h-1.5 w-28" />
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Illinois pays for the roof.
            <br />
            <span className="text-volt">You bridge the 90 days.</span>
          </h1>
          <p className="max-w-xl text-base text-muted-foreground md:text-lg">
            Lend USDC into a single roof's build. Ameren and Illinois Shines repay you in 90–120 days. Your Yield NFT keeps paying from the REC tail for six
            years.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="volt" size="lg">
              <Link to="/projects">Open auctions <ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/originate">Create a roof</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-6 border-t border-border pt-6 md:grid-cols-4">
            <Stat label="Live auctions" value={ready ? live.length : "—"} sub={`${notes.length} notes total`} />
            <Stat label="kW-DC created" value={ready ? kw.toFixed(0) : "—"} sub="solar + storage" />
            <Stat label="Lenders repaid" value={ready ? usd(repaid) : "—"} sub="principal + interest" />
            <Stat label="Tail paid" value={ready ? usd(tail) : "—"} sub="REC tail" accent />
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
        <SectionHead eyebrow="Underwriting" title="Price a roof" right={<span className="max-w-sm text-xs text-muted-foreground">$1.15/W solar, $250/kWh storage, 6.4 kWh per kW. Repaid by $300/kW + $300/kWh Ameren rebates and the first 50% REC payment.</span>} />
        <EconomicsCalculator />
      </section>
    </div>
  );
}
