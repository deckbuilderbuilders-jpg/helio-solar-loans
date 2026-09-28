import { createFileRoute } from "@tanstack/react-router";
import { Empty, NoteLink, SectionHead, Stat, pct, usd } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { getNote, nftClaimable, nftRemainingValue, short } from "@/lib/helio/ledger";
import { useHelio } from "@/lib/helio/store";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Yield NFT market — HELIO" },
      { name: "description", content: "Buy and sell HELIO Yield NFTs: tradable claims on the customer PPA and Illinois Shines REC tail of funded roofs." },
      { property: "og:title", content: "Yield NFT market — HELIO" },
      { property: "og:description", content: "Price the six-year PPA + REC tail yourself." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Market,
});

function Market() {
  const { state, wallet, buyNft } = useHelio();
  const listed = state.nfts.filter((x) => x.listPrice !== null);
  return (
    <div className="space-y-6">
      <SectionHead eyebrow="Secondary" title="Yield NFT market" right={<span className="max-w-sm text-xs text-muted-foreground">Unclaimed cash moves with the NFT. Tail left is undiscounted: remaining REC quarters + PPA at 65%.</span>} />
      {listed.length === 0 && <Empty title="Nothing listed" body="List a Yield NFT from your portfolio to set a price." />}
      <div className="grid gap-4 md:grid-cols-2">
        {listed.map((x) => {
          const n = getNote(state, x.noteId);
          const rem = nftRemainingValue(n, x);
          const c = nftClaimable(n, x);
          return (
            <div key={x.id} className="panel space-y-4 p-5">
              <div className="flex justify-between">
                <div>
                  <div className="eyebrow">{x.id} · seller {short(x.owner)}</div>
                  <NoteLink id={n.id}>{n.name}</NoteLink>
                </div>
                <span className="num text-sm">{pct(x.weight / n.totalWeight, 1)} of tail</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Price" value={usd(x.listPrice!)} accent />
                <Stat label="Tail left" value={usd(rem + c)} sub={`${24 - n.tailQuarters} qtrs + ${usd(c, 0)} unclaimed`} />
                <Stat label="Discount" value={pct(1 - x.listPrice! / (rem + c), 1)} />
              </div>
              <Button variant="volt" className="w-full" disabled={!wallet || x.owner === wallet} onClick={() => buyNft(x.id)}>
                {x.owner === wallet ? "Your listing" : "Buy"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
