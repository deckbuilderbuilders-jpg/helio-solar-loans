import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useHash } from "@/lib/hash/store";

export const fmt = (n: number, d = 0) => n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
export const usd = (n: number, d = 0) => `$${fmt(n, d)}`;

export function Shell({ children }: { children: ReactNode }) {
  const { s, faucet } = useHash();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-display text-lg font-semibold">HELIO</Link>
            <nav className="flex gap-1 text-sm">
              {([["/", "Projects"], ["/marketplace", "Marketplace"], ["/portfolio", "My HASH"]] as const).map(([to, label]) => (
                <Link key={to} to={to} activeOptions={{ exact: true }} className="rounded-sm px-3 py-1.5 text-muted-foreground hover:text-foreground" activeProps={{ className: "rounded-sm px-3 py-1.5 bg-secondary text-foreground" }}>
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="num text-sm text-muted-foreground">{usd(s.usd)} USDC</span>
            <Button size="sm" variant="secondary" onClick={faucet}>+ $1,000 test USDC</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:px-8">{children}</main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        HELIO DAO · Solar-powered Bitcoin mining · Devnet test
      </footer>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="eyebrow">{label}</div>
      <div className="num mt-2 text-2xl font-medium">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div className="h-full bg-primary" style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  );
}
