import { createFileRoute } from "@tanstack/react-router";
import { NoteCard } from "@/components/helio/ProjectCard";
import { SectionHead } from "@/components/helio/ui";
import { useHelio } from "@/lib/helio/store";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Open notes — HELIO" },
      { name: "description", content: "Live reverse Dutch auctions and funded bridge notes on Ameren Illinois solar + storage roofs." },
      { property: "og:title", content: "Open notes — HELIO" },
      { property: "og:description", content: "Live APR auctions on Illinois solar roofs, capped at 25%." },
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
        <SectionHead eyebrow="Reverse Dutch auction" title="Live auctions" right={<span className="text-xs text-muted-foreground">APR climbs 12% → 25% over 72h until filled</span>} />
        <div className="grid gap-4 md:grid-cols-2">{live.map((n) => <NoteCard key={n.id} n={n} now={now} />)}</div>
        {live.length === 0 && <p className="text-sm text-muted-foreground">No auctions open. Create a roof.</p>}
      </section>
      <section>
        <SectionHead eyebrow="Locked + settled" title="Funded notes" />
        <div className="grid gap-4 md:grid-cols-2">{rest.map((n) => <NoteCard key={n.id} n={n} now={now} />)}</div>
      </section>
    </div>
  );
}
