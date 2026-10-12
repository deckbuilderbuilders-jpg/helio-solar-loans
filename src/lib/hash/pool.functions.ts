import { createServerFn } from "@tanstack/react-start";

export interface PoolReading {
  configured: boolean;
  ok: boolean;
  hashrateTH: number;
  online: boolean;
  sats24h: number;
  satsTotal: number;
  updatedAt: string;
  error?: string;
}

const UNIT: Record<string, number> = { "H/s": 1e-12, "Kh/s": 1e-9, "Mh/s": 1e-6, "Gh/s": 1e-3, "Th/s": 1, "Ph/s": 1e3 };
let cache: { at: number; v: PoolReading } | null = null;

/** Live reading from the mining pool (Braiins Pool API). Cached 60s. */
export const getPoolReading = createServerFn({ method: "GET" }).handler(async (): Promise<PoolReading> => {
  const key = process.env["POOL_API_KEY"];
  const now = new Date().toISOString();
  const empty = { hashrateTH: 0, online: false, sats24h: 0, satsTotal: 0, updatedAt: now };
  if (!key) return { configured: false, ok: false, ...empty };
  if (cache && Date.now() - cache.at < 60_000) return cache.v;
  try {
    const r = await fetch("https://pool.braiins.com/accounts/profile/json/btc/", { headers: { "Pool-Auth-Token": key } });
    if (!r.ok) {
      console.error(`Pool request failed [${r.status}]: ${await r.text()}`);
      return cache?.v ? { ...cache.v, ok: false, error: `Pool returned ${r.status}` } : { configured: true, ok: false, ...empty, error: `Pool returned ${r.status}` };
    }
    const j = (await r.json()) as { btc?: Record<string, string | number> };
    const b = j.btc ?? {};
    const th = Number(b.hash_rate_5m ?? 0) * (UNIT[String(b.hash_rate_unit ?? "Gh/s")] ?? 1e-3);
    const v: PoolReading = {
      configured: true,
      ok: true,
      hashrateTH: th,
      online: Number(b.ok_workers ?? 0) > 0 || th > 0,
      sats24h: Math.round(Number(b.today_reward ?? 0) * 1e8),
      satsTotal: Math.round(Number(b.all_time_reward ?? 0) * 1e8),
      updatedAt: now,
    };
    cache = { at: Date.now(), v };
    return v;
  } catch (e) {
    console.error("Pool fetch error", e);
    return { configured: true, ok: false, ...empty, error: "Pool unreachable" };
  }
});
