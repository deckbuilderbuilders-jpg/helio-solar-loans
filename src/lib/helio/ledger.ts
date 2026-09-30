/**
 * HELIO ledger — pure state transitions for factored bridge notes.
 *
 *   create_note        creator pays $20/kW fee; APR fixed from the application's REC coverage
 *   deposit            lender adds principal; interest accrues from now; points 2x → 1x by fill
 *   withdraw           pre-fill exit, 2.5% fee (1.5% to stayers, 1.0% protocol)
 *   fail_note          admin: never filled, lenders refunded, creator fee lost
 *   mark_built         admin: installer base $0.33/W (+ $0.02/W if done in one day)
 *   mark_pto           admin: Permission to Operate
 *   record_takeout     admin: rebates + first REC land and the REC tail is factored at 65%
 *                      → lenders P+I → creator 5x → installer 7% of factor → HELIO
 *   release_collateral admin: 5% REC collateral → HELIO
 */
import { LOCKUP_MAX_DAYS, LOCKUP_MIN_DAYS, pointsForFill, pointsMultiplier } from "./auction";
import {
  PREBOND_EXIT_FEE,
  PREBOND_EXIT_TO_PROTOCOL,
  PREBOND_EXIT_TO_STAYERS,
  COVERAGE_MIN,
  projectEconomics,
  type ProjectEconomics,
} from "./economics";
import type { RecInputs } from "./rec";
import type { Address, ApplicationRecord, HelioNote, LedgerState, NoteStatus, Stage, TxLogEntry } from "./types";

export class HelioError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "HelioError";
  }
}
const fail = (code: string, message: string): never => {
  throw new HelioError(code, message);
};

export const short = (a: Address) => (a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);
export const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EPS = 1e-6;
const D = 86400;
const YEAR = 365 * D;

function nextId(s: LedgerState, prefix: string): [string, LedgerState] {
  const counter = s.counter + 1;
  return [`${prefix}-${counter.toString().padStart(3, "0")}`, { ...s, counter }];
}
function logTx(s: LedgerState, ix: string, signer: Address, detail: string, at: number): LedgerState {
  const entry: TxLogEntry = { id: `tx-${s.counter}-${s.log.length}-${at}`, at, ix, signer, detail };
  return { ...s, log: [entry, ...s.log].slice(0, 300) };
}
export function balanceOf(s: LedgerState, who: Address) {
  return s.balances[who] ?? 0;
}
function credit(s: LedgerState, who: Address, amt: number): LedgerState {
  if (amt <= 0) return s;
  return { ...s, balances: { ...s.balances, [who]: balanceOf(s, who) + amt } };
}
function debit(s: LedgerState, who: Address, amt: number, what: string): LedgerState {
  const bal = balanceOf(s, who);
  if (bal + EPS < amt) fail("InsufficientFunds", `${what}: wallet holds ${fmt(bal)} USDC, needs ${fmt(amt)}. Use the faucet.`);
  return { ...s, balances: { ...s.balances, [who]: bal - amt } };
}
function requireAdmin(s: LedgerState, signer: Address, ix: string) {
  if (signer !== s.config.admin) fail("Unauthorized", `${ix} is admin-only. Load the oracle admin wallet from the header menu.`);
}
export function getNote(s: LedgerState, id: string): HelioNote {
  return s.notes.find((n) => n.id === id) ?? fail("NoteNotFound", `Note ${id} does not exist.`);
}
function put(s: LedgerState, n: HelioNote): LedgerState {
  return { ...s, notes: s.notes.map((x) => (x.id === n.id ? n : x)) };
}

/* ── views ─────────────────────────────────────────────────────────── */

export const econOf = (n: HelioNote): ProjectEconomics => projectEconomics(n.kwDc, n.batteryKwh, n.rec);
export const raised = (n: HelioNote) => Object.values(n.deposits).reduce((a, b) => a + b, 0);
export const target = (n: HelioNote) => econOf(n).buildCost;
export const remaining = (n: HelioNote) => Math.max(0, target(n) - raised(n));
export const fillFraction = (n: HelioNote) => (n.stage >= 2 ? 1 : Math.min(1, raised(n) / Math.max(1, target(n))));

/** Points multiplier the next dollar would earn. */
export const livePoints = (n: HelioNote) => pointsMultiplier(fillFraction(n));
export const lenderPoints = (n: HelioNote, who: Address) => n.points[who] ?? 0;
export const totalPoints = (s: LedgerState, who: Address) => s.notes.reduce((a, n) => a + (n.failed ? 0 : lenderPoints(n, who)), 0);

export function noteStatus(n: HelioNote): NoteStatus {
  if (n.failed) return "Failed";
  return (["Filling", "Filling", "Funded", "Building", "Awaiting takeout", "Repaid", "Closed"] as const)[n.stage];
}

/** Settlement time: now, clamped to the 90–120 day window after funding. */
export function settleAt(n: HelioNote, now: number): number {
  if (!n.fundedAt) return now;
  return Math.min(n.fundedAt + LOCKUP_MAX_DAYS * D, Math.max(n.fundedAt + LOCKUP_MIN_DAYS * D, now));
}
export function lockupDays(n: HelioNote, now: number): number {
  if (!n.fundedAt) return LOCKUP_MIN_DAYS;
  return Math.round((settleAt(n, now) - n.fundedAt) / D);
}

/** Interest a lender has earned by `now`, accrued from each deposit's own timestamp. */
export function lenderInterest(n: HelioNote, who: Address, now: number): number {
  const p = n.deposits[who] ?? 0;
  if (p < EPS) return 0;
  const t = settleAt(n, now);
  const dollarSeconds = Math.max(0, p * t - (n.timeDollars[who] ?? p * t));
  return (n.apr * dollarSeconds) / YEAR;
}

export function lenderDue(n: HelioNote, now: number) {
  const principal = raised(n);
  const interest = Object.keys(n.deposits).reduce((a, who) => a + lenderInterest(n, who, now), 0);
  return { principal, interest, total: principal + interest };
}

/* ── instructions ──────────────────────────────────────────────────── */

export function faucet(s: LedgerState, who: Address, amount: number, now: number): LedgerState {
  return logTx(credit(s, who, amount), "faucet", who, `+${fmt(amount)} USDC-dev to ${short(who)}`, now);
}

export interface CreateArgs {
  name: string;
  city: string;
  address: string;
  kwDc: number;
  batteryKwh: number;
  rec: RecInputs;
  application?: ApplicationRecord | null;
  now: number;
}

/** Permissionless. The creator's fee is the only money at risk. */
export function createNote(s: LedgerState, creator: Address, a: CreateArgs): { state: LedgerState; note: HelioNote } {
  if (!a.name.trim()) fail("BadName", "Give the roof a name.");
  if (!(a.kwDc > 0) || !(a.rec.kwAc > 0)) fail("BadSize", "kW AC and kW DC must be positive.");
  if (a.rec.kwAc > 25) fail("TooLarge", "v1 notes are Small DG only (≤ 25 kW AC).");
  if (!(a.rec.capacityFactor > 0 && a.rec.capacityFactor < 0.4)) fail("BadCF", "Capacity factor must be between 0 and 0.4.");
  if (a.batteryKwh < 0) fail("BadBattery", "Battery kWh cannot be negative.");
  const e = projectEconomics(a.kwDc, a.batteryKwh, a.rec);
  if (e.coverage < COVERAGE_MIN)
    fail("Undercovered", `Coverage ${e.coverage.toFixed(2)}x is below the ${COVERAGE_MIN.toFixed(2)}x minimum. This roof can't be listed.`);
  const fee = e.applicationFee;
  let st = debit(s, creator, fee, "Application fee");
  st = credit(st, st.config.treasury, fee);
  const [id, s1] = nextId(st, "note");
  const note: HelioNote = {
    id,
    name: a.name.trim(),
    city: a.city.trim(),
    address: a.address.trim(),
    kwAc: a.rec.kwAc,
    kwDc: a.kwDc,
    batteryKwh: a.batteryKwh,
    rec: e.recInputs,
    application: a.application ?? null,
    creator,
    applicationFee: fee,
    apr: e.apr,
    stage: 1,
    failed: false,
    openedAt: a.now,
    deposits: {},
    timeDollars: {},
    points: {},
    exitBonus: {},
    fundedAt: null,
    dayOne: null,
    takeoutReceived: 0,
    factorProceeds: 0,
    lendersRepaid: 0,
    creatorPaid: 0,
    installerEarned: 0,
    helioEarned: 0,
    collateralReleased: false,
    createdAt: a.now,
  };
  const s2 = { ...s1, notes: [...s1.notes, note] };
  return {
    state: logTx(
      s2,
      "create_note",
      creator,
      `${note.name} · ${a.kwDc} kW-DC / ${a.rec.kwAc} kW-AC + ${a.batteryKwh} kWh · ${e.rec.quantity} RECs × $${e.rec.price.toFixed(2)} · ${e.coverage.toFixed(2)}x coverage → ${(e.apr * 100).toFixed(2)}% APR · fee ${fmt(fee)}${a.application?.fileHash ? ` · app ${a.application.fileHash.slice(0, 10)}…` : ""}`,
      a.now,
    ),
    note,
  };
}

export function deposit(s: LedgerState, a: { lender: Address; noteId: string; amount: number; now: number }): LedgerState {
  const n = getNote(s, a.noteId);
  if (n.failed || n.stage !== 1) fail("NoteClosed", `${n.name} is no longer taking deposits.`);
  if (!(a.amount > 0)) fail("BadAmount", "Deposit must be positive.");
  const room = remaining(n);
  const amt = Math.min(a.amount, room);
  const st0 = debit(s, a.lender, amt, "Deposit");
  const tgt = target(n);
  const r0 = raised(n);
  const pts = pointsForFill(tgt, r0 / tgt, (r0 + amt) / tgt);
  let note: HelioNote = {
    ...n,
    deposits: { ...n.deposits, [a.lender]: (n.deposits[a.lender] ?? 0) + amt },
    timeDollars: { ...n.timeDollars, [a.lender]: (n.timeDollars[a.lender] ?? 0) + amt * a.now },
    points: { ...n.points, [a.lender]: (n.points[a.lender] ?? 0) + pts },
  };
  let detail = `Deposited ${fmt(amt)} USDC into ${n.name} at ${(n.apr * 100).toFixed(2)}% APR · +${Math.round(pts).toLocaleString()} points (${(pts / amt).toFixed(2)}x)`;
  if (room - amt < EPS) {
    note = { ...note, stage: 2, fundedAt: a.now };
    detail += " → filled, lockup starts";
  }
  return logTx(put(st0, note), "deposit", a.lender, detail, a.now);
}

export function withdraw(s: LedgerState, a: { lender: Address; noteId: string; amount: number; now: number }) {
  const n = getNote(s, a.noteId);
  if (n.failed || n.stage !== 1) fail("Locked", `${n.name} has filled. Principal is locked until takeout.`);
  const held = n.deposits[a.lender] ?? 0;
  if (!(a.amount > 0) || a.amount > held + EPS) fail("BadAmount", `You have ${fmt(held)} USDC in this note.`);
  const amt = Math.min(a.amount, held);
  const refund = amt * (1 - PREBOND_EXIT_FEE);
  const toStayers = amt * PREBOND_EXIT_TO_STAYERS;
  const toProtocol = amt * PREBOND_EXIT_TO_PROTOCOL;
  const keep = held > EPS ? (held - amt) / held : 0;
  const deposits = { ...n.deposits, [a.lender]: held - amt };
  const timeDollars = { ...n.timeDollars, [a.lender]: (n.timeDollars[a.lender] ?? 0) * keep };
  const points = { ...n.points, [a.lender]: (n.points[a.lender] ?? 0) * keep };
  if ((deposits[a.lender] ?? 0) < EPS) {
    delete deposits[a.lender];
    delete timeDollars[a.lender];
    delete points[a.lender];
  }
  const stayers = Object.entries(deposits);
  const stayTotal = stayers.reduce((x, [, v]) => x + v, 0);
  const exitBonus = { ...n.exitBonus };
  let protocolCut = toProtocol;
  if (stayTotal > EPS) {
    for (const [who, v] of stayers) exitBonus[who] = (exitBonus[who] ?? 0) + (toStayers * v) / stayTotal;
  } else protocolCut += toStayers;
  let st = put(s, { ...n, deposits, timeDollars, points, exitBonus });
  st = credit(st, a.lender, refund);
  st = credit(st, st.config.treasury, protocolCut);
  return logTx(st, "withdraw", a.lender, `Withdrew ${fmt(amt)} from ${n.name}: ${fmt(refund)} back, ${fmt(toStayers)} to stayers, ${fmt(toProtocol)} protocol`, a.now);
}

export function failNote(s: LedgerState, signer: Address, noteId: string, now: number): LedgerState {
  requireAdmin(s, signer, "fail_note");
  const n = getNote(s, noteId);
  if (n.stage !== 1 || n.failed) fail("NotOpen", "Only an open note can be failed.");
  let st = s;
  for (const [who, v] of Object.entries(n.deposits)) st = credit(st, who, v + (n.exitBonus[who] ?? 0));
  for (const [who, v] of Object.entries(n.exitBonus)) if (!(who in n.deposits)) st = credit(st, who, v);
  st = put(st, { ...n, failed: true });
  return logTx(st, "fail_note", signer, `${n.name} did not fill. Lenders refunded in full; ${fmt(n.applicationFee)} application fee lost.`, now);
}

export function markBuilt(s: LedgerState, signer: Address, noteId: string, dayOne: boolean, now: number): LedgerState {
  requireAdmin(s, signer, "mark_built");
  const n = getNote(s, noteId);
  if (n.stage !== 2) fail("WrongStage", `${n.name} must be funded and not yet built.`);
  const e = econOf(n);
  const pay = e.installerBase + (dayOne ? e.installerDayOneBonus : 0);
  let st = credit(s, s.config.installer, pay);
  st = put(st, { ...n, stage: 3, dayOne });
  return logTx(st, "mark_built", signer, `${n.name} built${dayOne ? " in one day" : ""} → installer paid ${fmt(pay)} USDC`, now);
}

export function markPto(s: LedgerState, signer: Address, noteId: string, now: number): LedgerState {
  requireAdmin(s, signer, "mark_pto");
  const n = getNote(s, noteId);
  if (n.stage !== 3) fail("WrongStage", `${n.name} must be built before PTO.`);
  return logTx(put(s, { ...n, stage: 4 }), "mark_pto", signer, `${n.name} received Permission to Operate`, now);
}

/**
 * Takeout + factoring. `amount` = rebates + first REC payment net of collateral.
 * The REC tail is sold at 65% of face in the same instruction.
 * Waterfall: lenders P+I → creator 5x → installer 7% of factor → HELIO.
 */
export function recordTakeout(s: LedgerState, signer: Address, noteId: string, amount: number, now: number): LedgerState {
  requireAdmin(s, signer, "record_takeout");
  const n = getNote(s, noteId);
  if (n.stage !== 4) fail("WrongStage", `${n.name} needs PTO before takeout.`);
  if (!(amount > 0)) fail("BadAmount", "Takeout must be positive.");
  const e = econOf(n);
  const factor = e.factorProceeds;
  const cash = amount + factor;
  const due = lenderDue(n, now);
  const lendersPay = Math.min(cash, due.total);
  let left = cash - lendersPay;
  const creatorPay = Math.min(left, e.creatorTotal);
  left -= creatorPay;
  const installerPay = Math.min(left, e.installerFactorShare);
  left -= installerPay;
  let st = s;
  const ratio = due.total > 0 ? lendersPay / due.total : 0;
  for (const [who, v] of Object.entries(n.deposits)) {
    st = credit(st, who, (v + lenderInterest(n, who, now)) * ratio + (n.exitBonus[who] ?? 0));
  }
  st = credit(st, n.creator, creatorPay);
  st = credit(st, st.config.installer, installerPay);
  st = credit(st, st.config.treasury, left);
  st = put(st, {
    ...n,
    stage: 5,
    takeoutReceived: amount,
    factorProceeds: factor,
    lendersRepaid: lendersPay,
    creatorPaid: creatorPay,
    installerEarned: n.installerEarned + installerPay,
    helioEarned: n.helioEarned + left,
  });
  const shortBy = lendersPay + EPS < due.total ? ` (short ${fmt(due.total - lendersPay)})` : "";
  return logTx(
    st,
    "record_takeout",
    signer,
    `${n.name} takeout ${fmt(amount)} + REC tail factored ${fmt(factor)} (65% of ${fmt(e.factorFace)}): lenders ${fmt(lendersPay)}${shortBy}, creator ${fmt(creatorPay)}, installer ${fmt(installerPay)}, HELIO ${fmt(left)}`,
    now,
  );
}

/** Illinois Shines releases the 5% REC collateral → HELIO. */
export function releaseCollateral(s: LedgerState, signer: Address, noteId: string, now: number): LedgerState {
  requireAdmin(s, signer, "release_collateral");
  const n = getNote(s, noteId);
  if (n.stage !== 5) fail("WrongStage", `${n.name} has no collateral to release.`);
  if (n.collateralReleased) fail("AlreadyReleased", `${n.name} collateral was already released.`);
  const amt = econOf(n).recCollateral;
  let st = credit(s, s.config.treasury, amt);
  st = put(st, { ...n, stage: 6, collateralReleased: true, helioEarned: n.helioEarned + amt });
  return logTx(st, "release_collateral", signer, `${n.name} REC collateral ${fmt(amt)} released to HELIO`, now);
}

export type { Stage };
