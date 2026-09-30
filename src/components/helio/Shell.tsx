import { Link } from "@tanstack/react-router";
import { ChevronDown, Droplets, LogOut, RotateCcw, Wallet, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { short } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";
import { usdc } from "./ui";

const nav = [
  { to: "/projects", label: "Notes" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/originate", label: "Import" },
  { to: "/oracle", label: "Oracle" },
  { to: "/docs", label: "Docs" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="hazard h-1.5 w-full" aria-hidden />
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-8 md:px-8">{children}</main>
      <Footer />
    </div>
  );
}

function Header() {
  const { wallet, role, balance, ready, connect, disconnect, faucet, resetDemo } = useHelio();
  const roleLabel = role === "admin" ? "Oracle admin" : role === "installer" ? "Installer" : role ? "Demo lender" : "Wallet";
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-sm bg-volt text-volt-foreground">
              <Zap className="size-4" strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">HELIO</span>
            <span className="ml-1 hidden rounded-sm border border-volt/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-volt sm:inline">
              devnet
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-sm px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "rounded-sm px-3 py-1.5 text-sm text-foreground bg-secondary" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {wallet && (
            <span className="num hidden text-xs text-muted-foreground sm:inline">
              {ready ? usdc(balance, 0) : "…"}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={wallet ? "secondary" : "default"} size="sm" className="gap-2 font-mono text-xs" aria-label="Wallet menu">
                <Wallet className="size-3.5" />
                {wallet ? `${roleLabel} · ${short(wallet)}` : "Connect wallet"}
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="eyebrow">Demo keypairs (devnet)</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => connect("investor")}>Load demo lender</DropdownMenuItem>
              <DropdownMenuItem onClick={() => connect("admin")}>Load oracle admin</DropdownMenuItem>
              <DropdownMenuItem onClick={() => connect("installer")}>Load installer</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!wallet} onClick={() => faucet(10_000)}>
                <Droplets className="size-3.5" /> Faucet 10,000 USDC-dev
              </DropdownMenuItem>
              <DropdownMenuItem onClick={resetDemo}>
                <RotateCcw className="size-3.5" /> Reset demo state
              </DropdownMenuItem>
              {wallet && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={disconnect}>
                    <LogOut className="size-3.5" /> Disconnect
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-1 lg:hidden">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="shrink-0 rounded-sm px-3 py-1 text-sm text-muted-foreground" activeProps={{ className: "shrink-0 rounded-sm px-3 py-1 text-sm text-foreground bg-secondary" }}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
        <span>HELIO · Solana devnet · Illinois program year 2026–27 · Ameren Group A</span>
        <span className="font-mono">Not an offer of securities. Demo uses seeded keypairs and mock Ameren and Illinois Shines payments.</span>
      </div>
    </footer>
  );
}
