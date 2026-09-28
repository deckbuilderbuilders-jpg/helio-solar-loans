import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Empty, NoteLink, Pill, SectionHead, Stat, pct, usd, usdc } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getNote, lenderDue, liveApr, nftClaimable, nftRemainingValue, nftsOf, noteStatus } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";
import type { YieldNft } from "@/lib/helio/types";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — HELIO" },
      { name: "description", content: "Your open auction deposits, locked bridge notes, Yield NFTs and created roofs on HELIO." },
      { property: "og:title", content: "Portfolio — HELIO" },
      { property: "og:description", content: "Deposits, notes, Yield NFTs and claimable tail cash." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  const { state, wallet, balance, now, connect } = useHelio();
  if (!wallet) {
    return <Empty title="No wallet connected" body="Load the demo lender to see deposits, notes and Yield NFTs." cta={<Button variant="volt" onClick={() => connect("investor")}>Load demo lender</Button>} />;
  }
  const positions = state.notes.filter((n) => (n.deposits[wallet] ?? 0) > 0 && !n.failed);
  const inAuction = positions.filter((n) => n.stage === 1);
  const locked = positions.filter((n) => n.stage >= 2 && n.stage <= 4);
  const mine = nftsOf(state, wallet);
  const created = state.notes.filter((n) => n.creator === wallet);
  const claimTotal = mine.reduce((s, x) => s + nftClaimable(getNote(state, x.noteId), x), 0);
  const lockedDue = locked.reduce((s, n) => s + (n.deposits[wallet] / Math.max(1, lenderDue(n, now).principal)) * lenderDue(n, now).total, 0);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="Wallet" value={usdc(balance, 0)} />
        <Stat label="In auctions" value={usd(inAuction.reduce((s, n) => s + n.deposits[wallet], 0))} sub="withdrawable, 2.5% fee" />
        <Stat label="Locked notes" value={usd(lockedDue)} sub="due at takeout" />
        <Stat label="Claimable tail" value={usd(claimTotal, 2)} sub={`${mine.length} Yield NFTs`} accent />
      </div>

      <section>
        <SectionHead eyebrow="Bridge" title="Notes" />
        <div className="panel divide-y divide-border">
          {[...inAuction, ...locked].map((n) => (
            <div key={n.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <NoteLink id={n.id}>{n.name}</NoteLink>
              <span className="flex items-center gap-4">
                <span className="num">{usd(n.deposits[wallet])}</span>
                <span className="num text-volt">{pct(liveApr(n, now), 2)}</span>
                <Pill state={noteStatus(n)} />
              </span>
            </div>
          ))}
          {inAuction.length + locked.length === 0 && <div className="px-4 py-3 text-sm text-muted-foreground">No open notes. <Link to="/projects" className="text-volt">See auctions</Link>.</div>}
        </div>
      </section>

      <section>
        <SectionHead eyebrow="Tail" title="Yield NFTs" right={<Button asChild size="sm" variant="secondary"><Link to="/market">Market</Link></Button>} />
        <div className="grid gap-3 md:grid-cols-2">
          {mine.map((x) => <NftRow key={x.id} x={x} />)}
        </div>
        {mine.length === 0 && <p className="text-sm text-muted-foreground">Yield NFTs mint when a note you lent into fills.</p>}
      </section>

      <section>
        <SectionHead eyebrow="Creator" title="Roofs you created" />
        <div className="panel divide-y divide-border">
          {created.map((n) => (
            <div key={n.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <NoteLink id={n.id}>{n.name}</NoteLink>
              <span className="flex items-center gap-4 text-xs text-muted-foreground">
                fee {usd(n.applicationFee)} · 3x cash {n.creatorPaid ? `paid ${usd(n.creatorPaid)}` : `${usd(n.applicationFee * 3)} at takeout`} · 2x NFT {usd(n.applicationFee * 2)}
                <Pill state={noteStatus(n)} />
              </span>
            </div>
          ))}
          {created.length === 0 && <div className="px-4 py-3 text-sm text-muted-foreground">None yet. <Link to="/originate" className="text-volt">Create a roof</Link>.</div>}
        </div>
      </section>
    </div>
  );
}

function NftRow({ x }: { x: YieldNft }) {
  const { state, claimNft, listNft } = useHelio();
  const n = getNote(state, x.noteId);
  const c = nftClaimable(n, x);
  const rem = nftRemainingValue(n, x);
  const [price, setPrice] = useState(String(Math.round(rem * 0.8)));
  return (
    <div className="panel space-y-3 p-4">
      <div className="flex justify-between">
        <div>
          <div className="eyebrow">{x.id} · {x.kind === "creator" ? "creator 2x" : "lender"}</div>
          <NoteLink id={n.id}>{n.name}</NoteLink>
        </div>
        <span className="num text-sm">{pct(x.weight / Math.max(1, n.totalWeight), 1)} of tail</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <Stat label="Claimable" value={usd(c, 2)} accent />
        <Stat label="Tail left" value={usd(rem)} sub={`${24 - n.tailQuarters} quarters`} />
        <Stat label="Listed" value={x.listPrice ? usd(x.listPrice) : "—"} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="volt" disabled={c < 0.005} onClick={() => claimNft(x.id)}>Claim</Button>
        {x.listPrice ? (
          <Button size="sm" variant="secondary" onClick={() => listNft(x.id, null)}>Delist</Button>
        ) : (
          <>
            <Input className="h-8 w-28" type="number" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="List price" />
            <Button size="sm" variant="secondary" onClick={() => listNft(x.id, parseFloat(price))}>List</Button>
          </>
        )}
      </div>
    </div>
  );
}
