import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Fields read from an Illinois Shines application. Every value may be null. */
export interface ExtractedApplication {
  siteName: string | null;
  applicant: string | null;
  address: string | null;
  city: string | null;
  utility: string | null;
  group: "A" | "B" | null;
  kwDc: number | null;
  kwAc: number | null;
  capacityFactor: number | null;
  partIQty: number | null;
  partIIQty: number | null;
  customerOwned: boolean | null;
  eec: boolean | null;
  batteryKwh: number | null;
  programYear: string | null;
  lowConfidence: string[];
  notes: string | null;
}

const FIELDS = ["siteName", "applicant", "address", "city", "utility", "group", "kwDc", "kwAc", "capacityFactor", "partIQty", "partIIQty", "customerOwned", "eec", "batteryKwh", "programYear"] as const;

const nStr = { type: ["string", "null"] };
const nNum = { type: ["number", "null"] };
const nBool = { type: ["boolean", "null"] };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [...FIELDS, "lowConfidence", "notes"],
  properties: {
    siteName: nStr,
    applicant: nStr,
    address: nStr,
    city: nStr,
    utility: nStr,
    group: { type: ["string", "null"], enum: ["A", "B", null] },
    kwDc: nNum,
    kwAc: nNum,
    capacityFactor: nNum,
    partIQty: nNum,
    partIIQty: nNum,
    customerOwned: nBool,
    eec: nBool,
    batteryKwh: nNum,
    programYear: nStr,
    lowConfidence: { type: "array", items: { type: "string", enum: [...FIELDS] } },
    notes: nStr,
  },
};

const PROMPT = `You read Illinois Shines (Adjustable Block Program) Part I / Part II applications for residential distributed generation.
Extract these fields exactly as stated in the document. Use null when a value is not present — never guess.
- siteName: a short label like "Street — City" built from the site address.
- applicant, address (street line), city ("City, IL").
- utility: the electric utility named. group: "A" for Ameren Illinois, MidAmerican, Mt. Carmel or MISO co-ops/munis; "B" for ComEd or PJM co-ops/munis.
- kwDc: DC nameplate kW. kwAc: inverter / AC nameplate kW.
- capacityFactor: approved capacity factor as a decimal (16.42% → 0.1642).
- partIQty, partIIQty: contracted 15-year REC quantities if stated.
- customerOwned: true if the system is customer-owned (purchase/loan, no federal ITC); false for lease/PPA-owned.
- eec: true if submitted in the Equity Eligible Contractor category.
- batteryKwh: paired storage usable kWh if stated.
- programYear: e.g. "2026–27".
List in lowConfidence every field you inferred, found ambiguous, or could not read clearly. Put any warnings in notes.`;

const Input = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.string().max(100),
  /** base64 for PDFs and images; raw text for CSV / JSON / TXT. */
  data: z.string().min(1).max(14_000_000),
  kind: z.enum(["pdf", "image", "text"]),
});

export type ExtractResult = { ok: true; fields: ExtractedApplication } | { ok: false; error: string };

export const extractApplication = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<ExtractResult> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false, error: "The document reader isn't configured." };

    const part =
      data.kind === "pdf"
        ? { type: "input_file", filename: data.fileName, file_data: `data:application/pdf;base64,${data.data}` }
        : data.kind === "image"
          ? { type: "input_image", image_url: `data:${data.mimeType || "image/png"};base64,${data.data}` }
          : { type: "input_text", text: `File ${data.fileName}:\n\n${data.data.slice(0, 200_000)}` };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: { format: { type: "json_schema", name: "shines_application", strict: true, schema: SCHEMA } },
        input: [{ role: "user", content: [{ type: "input_text", text: PROMPT }, part] }],
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      console.error("extractApplication gateway error", res.status, body.slice(0, 500));
      if (res.status === 402) return { ok: false, error: "AI credits are used up. Add credits in workspace settings, or fill the form by hand." };
      if (res.status === 429) return { ok: false, error: "The document reader is busy. Try again in a minute." };
      if (res.status === 403) return { ok: false, error: "The document reader isn't available for this workspace. Fill the form by hand." };
      return { ok: false, error: `Couldn't read the document (${res.status}). Fill the form by hand.` };
    }

    // Accumulate the streamed output text.
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    let failure: string | null = null;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const frame = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const ev = JSON.parse(payload) as { type?: string; delta?: string; response?: { error?: { message?: string } }; message?: string; refusal?: string };
            if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
            else if (ev.type === "response.refusal.delta") failure = "The document reader declined this file.";
            else if (ev.type === "response.failed" || ev.type === "error") failure = ev.response?.error?.message ?? ev.message ?? "Reading failed.";
          } catch {
            /* ignore partial frames */
          }
        }
      }
    }
    if (failure) return { ok: false, error: failure };
    if (!text.trim()) return { ok: false, error: "Nothing could be read from this file. Fill the form by hand." };
    try {
      const fields = JSON.parse(text) as ExtractedApplication;
      return { ok: true, fields };
    } catch {
      return { ok: false, error: "The reader returned an unexpected format. Fill the form by hand." };
    }
  });
