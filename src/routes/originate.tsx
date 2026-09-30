import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileUp, Loader2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { EconomicsTable } from "@/components/helio/Economics";
import { SectionHead, pct, usd } from "@/components/helio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { extractApplication } from "@/lib/helio/application.functions";
import { COVERAGE_MIN, batteryForSize, projectEconomics } from "@/lib/helio/economics";
import { REC_PROGRAM_YEAR, defaultRecInputs, type RecGroup } from "@/lib/helio/rec";
import { useHelio } from "@/lib/helio/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/originate")({
  head: () => ({
    meta: [
      { title: "Import an application — HELIO" },
      { name: "description", content: "Upload an Illinois Shines application; HELIO reads the REC inputs, prices the note at 18–24% APR, and opens it for funding." },
      { property: "og:title", content: "Import an application — HELIO" },
      { property: "og:description", content: "From Illinois Shines application to on-chain note." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Create,
});

interface Form {
  name: string;
  city: string;
  address: string;
  kwDc: number;
  batteryKwh: number;
  group: RecGroup;
  kwAc: number;
  capacityFactor: number;
  customerOwned: boolean;
  eec: boolean;
  partIQty: number | null;
  partIIQty: number | null;
  programYear: string;
}
type Key = keyof Form;

const initial = (): Form => {
  const r = defaultRecInputs(10);
  return { name: "", city: "Springfield, IL", address: "", kwDc: 10, batteryKwh: 64, ...r, programYear: REC_PROGRAM_YEAR };
};

async function sha256Hex(buf: ArrayBuffer) {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function Create() {
  const { wallet, createNote } = useHelio();
  const nav = useNavigate();
  const extract = useServerFn(extractApplication);
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<Form>(initial);
  const [file, setFile] = useState<{ name: string; hash: string } | null>(null);
  const [extracted, setExtracted] = useState<Partial<Record<Key, unknown>>>({});
  const [unsure, setUnsure] = useState<string[]>([]);
  const [edited, setEdited] = useState<Set<Key>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const e = useMemo(() => {
    try {
      return projectEconomics(f.kwDc || 0.001, f.batteryKwh || 0, {
        group: f.group,
        kwAc: f.kwAc || 0.001,
        capacityFactor: f.capacityFactor || 0.0001,
        customerOwned: f.customerOwned,
        eec: f.eec,
        partIQty: f.partIQty,
        partIIQty: f.partIIQty,
        programYear: f.programYear,
      });
    } catch {
      return null;
    }
  }, [f]);

  const set = <K extends Key>(k: K, v: Form[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (k in extracted) setEdited((s) => new Set(s).add(k));
  };
  const num = (k: Key, allowNull = false) => (ev: React.ChangeEvent<HTMLInputElement>) => {
    const raw = ev.target.value.trim();
    const v = raw === "" && allowNull ? null : parseFloat(raw) || 0;
    set(k, v as never);
  };

  async function onFile(fl: File) {
    setErr(null);
    setNote(null);
    if (fl.size > 10 * 1024 * 1024) return setErr("That file is over 10 MB. Upload a smaller copy.");
    setBusy(true);
    try {
      const buf = await fl.arrayBuffer();
      const hash = await sha256Hex(buf);
      setFile({ name: fl.name, hash });
      const isPdf = fl.type === "application/pdf" || fl.name.toLowerCase().endsWith(".pdf");
      const isImg = fl.type.startsWith("image/");
      const kind = isPdf ? "pdf" : isImg ? "image" : "text";
      const data = kind === "text" ? new TextDecoder().decode(buf) : toBase64(buf);
      const r = await extract({ data: { fileName: fl.name, mimeType: fl.type, data, kind } });
      if (!r.ok) return setErr(r.error);
      const x = r.fields;
      const next: Partial<Form> = {};
      if (x.siteName) next.name = x.siteName;
      if (x.city) next.city = x.city;
      if (x.address) next.address = x.address;
      if (x.group) next.group = x.group;
      if (x.kwDc) next.kwDc = x.kwDc;
      if (x.kwAc) next.kwAc = x.kwAc;
      if (x.capacityFactor) next.capacityFactor = x.capacityFactor > 1 ? x.capacityFactor / 100 : x.capacityFactor;
      next.partIQty = x.partIQty ?? null;
      next.partIIQty = x.partIIQty ?? null;
      if (x.customerOwned !== null) next.customerOwned = x.customerOwned;
      if (x.eec !== null) next.eec = x.eec;
      if (x.batteryKwh !== null) next.batteryKwh = x.batteryKwh;
      else if (x.kwDc) next.batteryKwh = batteryForSize(x.kwDc);
      if (x.programYear) next.programYear = x.programYear;
      setF((p) => ({ ...p, ...next }));
      setExtracted(next);
      setEdited(new Set());
      setUnsure(x.lowConfidence ?? []);
      setNote(x.notes);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Couldn't read that file.");
    } finally {
      setBusy(false);
    }
  }

  const flag = (k: Key) => cn(k in extracted && "border-volt/50", unsure.includes(k) && !edited.has(k) && "border-warning bg-warning/10");
  const tag = (k: Key) => (edited.has(k) ? "edited" : unsure.includes(k) ? "check this" : k in extracted ? "from document" : undefined);

  return (
    <div className="space-y-8">
      <SectionHead
        eyebrow="Permissionless"
        title="Import an Illinois Shines application"
        right={<span className="max-w-sm text-xs text-muted-foreground">Every REC input is already on the application. Upload it, check the values, and the note is priced and opened.</span>}
      />

      <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="text-sm">
          <div className="font-medium">1. Upload the application</div>
          <div className="text-xs text-muted-foreground">PDF, photo or screenshot, or a CSV / JSON export. Max 10 MB. Only a fingerprint of the file is saved.</div>
          {file && <div className="mt-1 font-mono text-[10px] text-muted-foreground">{file.name} · sha256 {file.hash.slice(0, 20)}…</div>}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,image/*,.csv,.json,.txt"
          className="hidden"
          onChange={(ev) => {
            const fl = ev.target.files?.[0];
            if (fl) void onFile(fl);
            ev.target.value = "";
          }}
        />
        <Button variant="volt" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
          {busy ? "Reading application…" : file ? "Upload another" : "Upload application"}
        </Button>
        {err && <p className="w-full text-xs text-destructive">{err}</p>}
        {note && <p className="w-full text-xs text-muted-foreground">Reader note: {note}</p>}
      </div>

      <div className="panel space-y-4 p-5">
        <div className="text-sm font-medium">2. Check the values {unsure.length > 0 && <span className="text-xs text-warning">· highlighted fields need a look</span>}</div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Site name" tag={tag("name")}><Input className={flag("name")} value={f.name} onChange={(ev) => set("name", ev.target.value)} placeholder="Elm St — Peoria" /></Field>
          <Field label="City" tag={tag("city")}><Input className={flag("city")} value={f.city} onChange={(ev) => set("city", ev.target.value)} /></Field>
          <Field label="Address" tag={tag("address")}><Input className={flag("address")} value={f.address} onChange={(ev) => set("address", ev.target.value)} /></Field>
          <Field label="kW DC" tag={tag("kwDc")}><Input className={flag("kwDc")} type="number" value={f.kwDc} onChange={num("kwDc")} /></Field>
          <Field label="kW AC (≤ 25)" tag={tag("kwAc")}><Input className={flag("kwAc")} type="number" value={f.kwAc} onChange={num("kwAc")} /></Field>
          <Field label="Storage kWh" tag={tag("batteryKwh")}><Input className={flag("batteryKwh")} type="number" value={f.batteryKwh} onChange={num("batteryKwh")} /></Field>
          <Field label="Capacity factor (decimal)" tag={tag("capacityFactor")}><Input className={flag("capacityFactor")} type="number" step="0.0001" value={f.capacityFactor} onChange={num("capacityFactor")} /></Field>
          <Field label="Part I REC qty (optional)" tag={tag("partIQty")}><Input className={flag("partIQty")} type="number" value={f.partIQty ?? ""} onChange={num("partIQty", true)} /></Field>
          <Field label="Part II REC qty (optional)" tag={tag("partIIQty")}><Input className={flag("partIIQty")} type="number" value={f.partIIQty ?? ""} onChange={num("partIIQty", true)} /></Field>
          <Field label="Utility group" tag={tag("group")}>
            <div className={cn("flex h-9 items-center gap-3 rounded-md border px-3 text-sm", flag("group"))}>
              <span className={f.group === "A" ? "text-foreground" : "text-muted-foreground"}>A · Ameren</span>
              <Switch checked={f.group === "B"} onCheckedChange={(b) => set("group", b ? "B" : "A")} aria-label="Group B" />
              <span className={f.group === "B" ? "text-foreground" : "text-muted-foreground"}>B · ComEd</span>
            </div>
          </Field>
          <Field label="Customer-owned (+$20/REC)" tag={tag("customerOwned")}>
            <div className={cn("flex h-9 items-center rounded-md border px-3", flag("customerOwned"))}><Switch checked={f.customerOwned} onCheckedChange={(b) => set("customerOwned", b)} /></div>
          </Field>
          <Field label="Equity Eligible Contractor (+$5/REC)" tag={tag("eec")}>
            <div className={cn("flex h-9 items-center rounded-md border px-3", flag("eec"))}><Switch checked={f.eec} onCheckedChange={(b) => set("eec", b)} /></div>
          </Field>
        </div>
        {f.programYear !== REC_PROGRAM_YEAR && <p className="text-xs text-warning">Application program year is {f.programYear}; only {REC_PROGRAM_YEAR} prices are modelled.</p>}
      </div>

      <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="text-sm">
          <div className="font-medium">3. Create the note</div>
          {e ? (
            <div className="text-muted-foreground">
              {e.rec.quantity} RECs × ${e.rec.price.toFixed(2)} = <span className="num text-foreground">{usd(e.rec.contractValue)}</span> · coverage{" "}
              <span className="num text-foreground">{e.coverage.toFixed(2)}x</span> →{" "}
              {e.listable ? <span className="num text-volt">{pct(e.apr, 2)} APR</span> : <span className="text-destructive">below {COVERAGE_MIN.toFixed(2)}x, can't list</span>} · fee{" "}
              <span className="num text-foreground">{usd(e.applicationFee)}</span> → {usd(e.creatorTotal)} cash at takeout
            </div>
          ) : (
            <div className="text-destructive">Check kW AC — no REC price bin for that size.</div>
          )}
        </div>
        <Button
          variant="volt"
          disabled={!wallet || !e?.listable}
          onClick={() => {
            const n = createNote({
              name: f.name,
              city: f.city,
              address: f.address,
              kwDc: f.kwDc,
              batteryKwh: f.batteryKwh,
              rec: e!.recInputs,
              application: file ? { fileName: file.name, fileHash: file.hash, editedFields: [...edited], importedAt: Math.floor(Date.now() / 1000) } : null,
            });
            if (n) nav({ to: "/project/$id", params: { id: n.id } });
          }}
        >
          {wallet ? (e ? `Pay ${usd(e.applicationFee)} and open note` : "Fix the size") : "Connect a wallet"}
        </Button>
      </div>
      {e && f.kwDc > 0 && <div className="panel p-5"><EconomicsTable e={e} /></div>}
    </div>
  );
}

function Field({ label, tag, children }: { label: string; tag?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex justify-between text-xs text-muted-foreground">
        {label}
        {tag && <span className={cn("font-mono text-[10px] uppercase", tag === "check this" ? "text-warning" : "text-volt")}>{tag}</span>}
      </Label>
      {children}
    </div>
  );
}
