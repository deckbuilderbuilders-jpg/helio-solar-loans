import { createFileRoute } from "@tanstack/react-router";
import { ProjectCard } from "@/components/helio/ProjectCard";
import { Empty, SectionHead, Stat, usd } from "@/components/helio/ui";
import { PANEL_PRICE_USDC } from "@/lib/helio/constants";
import { projectStatus } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Originated projects — HELIO" },
      { name: "description", content: "Every Ameren Illinois job HELIO has originated: location, kW, panels bonded, funding raised and contracted takeout." },
      { property: "og:title", content: "Originated projects — HELIO" },
      { property: "og:description", content: "Ameren Illinois solar jobs open for panel bonding." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Projects,
});

function Projects() {
  const { state } = useHelio();
  const bonding = state.projects.filter((p) => projectStatus(p) === "Bonding");
  const raised = state.projects.reduce((s, p) => s + p.panelsBonded * PANEL_PRICE_USDC, 0);
  const takeout = state.projects.reduce((s, p) => s + p.takeout.takeout, 0);

  return (
    <div className="space-y-8">
      <SectionHead
        eyebrow="Origination book"
        title="Illinois jobs underwritten by HELIO"
        right={
          <div className="flex gap-6">
            <Stat label="Open for bonding" value={bonding.length} sub={`${state.projects.length} total jobs`} />
            <Stat label="Raised" value={usd(raised)} sub="panels burned × $400" />
            <Stat label="Contracted takeout" value={usd(takeout)} sub="rebate + first REC" accent />
          </div>
        }
      />

      {state.projects.length === 0 ? (
        <Empty title="No jobs originated yet" body="Load the originator admin wallet and publish a project from the Originate page." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.projects.map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
