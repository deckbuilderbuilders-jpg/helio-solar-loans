import { createFileRoute } from "@tanstack/react-router";
import { NoteCard } from "@/components/helio/ProjectCard";
import { SectionHead } from "@/components/helio/ui";
import { useHelio } from "@/lib/helio/store";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Open notes — HELIO" },
      { name: "description", content: "Open and funded HELIO bridge notes on Illinois solar + storage roofs, each priced 18–24% APR from its REC value." },
      { property: "og:title", content: "Open notes — HELIO" },
      { property: "og:description", content: "Fixed 18–24% APR notes on Illinois solar roofs, repaid in 90–120 days." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Projects,
});

function Projects() {
  const { state, now } = useHelio();
  const live = state.notes.filter((n) => n.stage === 1 && !n.failed);
  const rest = state.notes.filter((n) => !(n.stage === 1 && !n.failed));
  return (
    <div className="space-y-10">
      <section>
        <SectionHead eyebrow="Fixed APR · points 2x → 1x" title="Filling now" right={<span className="text-xs text-muted-foreground">Each APR is set by the roof's REC coverage. Early dollars earn up to 2x points.</span>} />
        <div className="grid gap-4 md:grid-cols-2">{live.map((n) => <NoteCard key={n.id} n={n} now={now} />)}</div>
        {live.length === 0 && <p className="text-sm text-muted-foreground">No notes filling. Import an application to create one.</p>}
      </section>
      <section>
        <SectionHead eyebrow="Locked + settled" title="Funded notes" />
        <div className="grid gap-4 md:grid-cols-2">{rest.map((n) => <NoteCard key={n.id} n={n} now={now} />)}</div>
      </section>
    </div>
  );
}
