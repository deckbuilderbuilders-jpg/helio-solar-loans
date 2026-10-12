import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "HELIO — Sunlight in. Bitcoin out." },
      { name: "description", content: "A DAO that turns solar power into Bitcoin. Bond USDC, get HASH, earn 80% of what we mine." },
      { property: "og:title", content: "HELIO — Sunlight in. Bitcoin out." },
      { property: "og:description", content: "A DAO that turns solar power into Bitcoin. Bond USDC, get HASH, earn 80% of what we mine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  useEffect(() => {
    try { localStorage.setItem("helio.welcomed", "1"); } catch { /* ignore */ }
  }, []);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 md:px-8">
        <span className="font-display text-lg font-semibold">HELIO</span>
        <Link to="/" className="text-sm hover:underline">Enter app →</Link>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16 md:px-8">
        <div className="eyebrow">Solar mining DAO</div>
        <h1 className="mt-4 max-w-3xl font-display text-5xl font-semibold leading-tight md:text-7xl">Sunlight in. Bitcoin out.</h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Bond USDC into a solar project. Get HASH. Earn 80% of the Bitcoin our miners make.
        </p>
        <div className="mt-8">
          <Button asChild size="lg"><Link to="/">See projects</Link></Button>
        </div>

        <ol className="mt-20 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
          {[
            ["Bond", "Early buyers get the most HASH."],
            ["Build", "Full project? We install solar + miners."],
            ["Mine", "80% of the Bitcoin goes to you."],
            ["Grow", "Solar payments buy more miners."],
          ].map(([t, d], i) => (
            <li key={t} className="bg-card p-6">
              <div className="font-mono text-xs text-primary">0{i + 1}</div>
              <div className="mt-2 font-display text-xl font-semibold">{t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-muted-foreground">Network today: 100 TH. Every project adds more.</p>
      </main>
    </div>
  );
}
