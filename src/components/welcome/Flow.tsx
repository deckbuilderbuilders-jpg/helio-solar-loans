import { ArrowRight, Bitcoin, Cpu, ShieldCheck, Sun, Wallet, Zap } from "lucide-react";

const STEPS = [
  { icon: Wallet, title: "Bond USDC", sub: "Get HASH" },
  { icon: Cpu, title: "Build", sub: "Solar + miners" },
  { icon: Sun, title: "Power", sub: "Free sunlight" },
  { icon: Bitcoin, title: "Earn", sub: "80% of BTC mined" },
];

const TRUST = [
  ["Real equipment", "Every dollar buys panels, batteries and miners."],
  ["State contract", "Illinois Shines REC payments buy more hardware."],
  ["No fuel cost", "Miners run on the project's own solar."],
  ["80% to holders", "The DAO keeps 20% for operations."],
];

export function Flow() {
  return (
    <section className="border-b border-border">
      <div className="welcome-container grid gap-10 py-14 md:grid-cols-[1fr_2.4fr] md:items-center md:py-16">
        <h2 className="welcome-heading">Sunlight in.<br /><span className="text-volt">Bitcoin out.</span></h2>
        <ol className="grid grid-cols-2 gap-6 md:flex md:items-start md:justify-between">
          {STEPS.map(({ icon: Icon, title, sub }, i) => (
            <li key={title} className="flex items-start gap-3 md:flex-col md:items-center md:text-center">
              <div className="flex items-center gap-3">
                <span className="grid size-14 place-items-center border border-border bg-card"><Icon className="size-6 text-volt" /></span>
                {i < STEPS.length - 1 && <ArrowRight className="hidden size-4 text-muted-foreground md:block" />}
              </div>
              <div><div className="text-base font-medium">{title}</div><div className="text-sm text-muted-foreground">{sub}</div></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Trust() {
  return (
    <section className="border-b border-border bg-card">
      <div className="welcome-container py-14 md:py-16">
        <div className="welcome-kicker">WHAT BACKS YOUR HASH</div>
        <dl className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-2 md:grid-cols-4">
          {TRUST.map(([t, d], i) => (
            <div key={t} className="bg-background p-6">
              {i === 0 ? <ShieldCheck className="size-5 text-volt" /> : <Zap className="size-5 text-volt" />}
              <dt className="mt-4 text-lg font-medium">{t}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
