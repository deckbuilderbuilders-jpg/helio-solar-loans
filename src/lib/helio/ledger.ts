/**
 * HELIO ledger — pure state transitions for the bridge-note + Yield NFT model.
 *
 *   create_note     creator pays $20/kW application fee (burned if the note never funds)
 *   deposit         lender adds principal while the auction is open
 *   withdraw        pre-bonding exit, 2.5% fee (1.5% to stayers, 1.0% protocol)
 *   (fill)          last dollar locks the clearing APR and mints Yield NFTs
 *   fail_note       admin: auction abandoned, lenders refunded, creator fee lost
 *   mark_built      admin: installer base $0.33/W (+ $0.02/W if done in one day)
 *   mark_pto        admin: Permission to Operate
 *   record_takeout  admin: rebates + first REC land → lenders repaid P+I, creator 3x cash
 *   record_tail     admin: one quarter of REC tail → 65% NFTs / 28% HELIO / 7% installer
 *   claim / list / delist / buy  Yield NFT cash and secondary market
 */
import { APR_CAP, auctionApr, auctionWeight, LOCKUP_MAX_DAYS, LOCKUP_MIN_DAYS, noteInterest } from "./auction";
import {
  APPLICATION_FEE_PER_KW,
  CREATOR_CASH_MULTIPLE,
  CREATOR_YIELD_MULTIPLE,
  PREBOND_EXIT_FEE,
  PREBOND_EXIT_TO_PROTOCOL,
  PREBOND_EXIT_TO_STAYERS,
  TAIL_QUARTERS,
  TAIL_TO_HELIO,
  TAIL_TO_INSTALLER,
  TAIL_TO_YIELD,
  projectEconomics,
  type ProjectEconomics,
} from "./economics";
import type { Address, HelioNote, LedgerState, NoteStatus, Stage, TxLogEntry, YieldNft } from "./types";

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

export const econOf = (n: HelioNote): ProjectEconomics => projectEconomics(n.kwDc, n.batteryKwh);
export const raised = (n: HelioNote) => Object.values(n.deposits).reduce((a, b) => a + b, 0);
export const target = (n: HelioNote) => econOf(n).buildCost;
export const remaining = (n: HelioNote) => Math.max(0, target(n) - raised(n));

export function liveApr(n: HelioNote, now: number): number {
  if (n.clearingApr !== null) return n.clearingApr;
  return auctionApr((now - n.openedAt) / 3600);
}

/** Tail multiplier a new deposit would get right now (1.8x → 1x). */
export function liveWeight(n: HelioNote, now: number): number {
  if (n.clearingApr !== null) return 1;
  return auctionWeight((now - n.openedAt) / 3600);
}

/** A lender's blended APR across their deposits. */
export function lenderApr(n: HelioNote, who: Address): number {
  const p = n.deposits[who] ?? 0;
  const a = n.aprDollars?.[who];
  return p > EPS && a !== undefined ? a / p : n.clearingApr ?? APR_CAP;
}

/** A lender's blended tail multiplier. */
export function lenderWeight(n: HelioNote, who: Address): number {
  const p = n.deposits[who] ?? 0;
  const w = n.weightDollars?.[who];
  return p > EPS && w !== undefined ? w / p : 1;
}

export function noteStatus(n: HelioNote): NoteStatus {
  if (n.failed) return "Failed";
  return (["Auction", "Auction", "Funded", "Building", "Awaiting takeout", "Repaid", "Streaming", "Complete"] as const)[n.stage];
}

/** Lockup days from funding to `now`, clamped to the 90–120 day window. */
export function lockupDays(n: HelioNote, now: number): number {
  if (!n.fundedAt) return LOCKUP_MIN_DAYS;
  return Math.min(LOCKUP_MAX_DAYS, Math.max(LOCKUP_MIN_DAYS, Math.round((now - n.fundedAt) / D)));
}

/** What the note owes all lenders at settlement (each at their own locked APR). */
export function lenderDue(n: HelioNote, now: number) {
  const principal = raised(n);
  const days = lockupDays(n, now);
  const interest = Object.entries(n.deposits).reduce((s, [who, v]) => s + noteInterest(v, lenderApr(n, who), days), 0);
  return { principal, interest, total: principal + interest };
}

export function nftClaimable(n: HelioNote, nft: YieldNft): number {
  return Math.max(0, nft.weight * n.accPerWeight - nft.claimed);
}

/** Undiscounted tail still to come for this NFT (remaining REC quarters only; PPA goes to HELIO). */
export function nftRemainingValue(n: HelioNote, nft: YieldNft): number {
  if (n.totalWeight <= 0) return 0;
  const e = econOf(n);
  const left = Math.max(0, TAIL_QUARTERS - n.tailQuarters);
  const perQuarter = e.recTailPerQuarter;
  return (nft.weight / n.totalWeight) * left * perQuarter * TAIL_TO_YIELD;
}

export const nftsOf = (s: LedgerState, who: Address) => s.nfts.filter((x) => x.owner === who);

/* ── instructions ──────────────────────────────────────────────────── */

export function faucet(s: LedgerState, who: Address, amount: number, now: number): LedgerState {
  return logTx(credit(s, who, amount), "faucet", who, `+${fmt(amount)} USDC-dev to ${short(who)}`, now);
}

export interface CreateArgs {
  name: string;
  city: string;
  address: string;
  kwAc: number;
  kwDc: number;
  batteryKwh: number;
  now: number;
}

/** Permissionless. The creator's fee is the only money at risk. */
export function createNote(s: LedgerState, creator: Address, a: CreateArgs): { state: LedgerState; note: HelioNote } {
  if (!a.name.trim()) fail("BadName", "Give the roof a name.");
  if (!(a.kwDc > 0) || !(a.kwAc > 0)) fail("BadSize", "kW AC and kW DC must be positive.");
  if (a.kwAc > 25) fail("TooLarge", "v1 notes are Small DG only (≤ 25 kW AC).");
  if (a.batteryKwh < 0) fail("BadBattery", "Battery kWh cannot be negative.");
  const fee = a.kwDc * APPLICATION_FEE_PER_KW;
  let st = debit(s, creator, fee, "Application fee");
  st = credit(st, st.config.treasury, fee);
  const [id, s1] = nextId(st, "note");
  const note: HelioNote = {
    id,
    name: a.name.trim(),
    city: a.city.trim(),
    address: a.address.trim(),
    kwAc: a.kwAc,
    kwDc: a.kwDc,
    batteryKwh: a.batteryKwh,
    creator,
    applicationFee: fee,
    stage: 1,
    failed: false,
    openedAt: a.now,
    deposits: {},
    exitBonus: {},
    clearingApr: null,
    fundedAt: null,
    dayOne: null,
    takeoutReceived: 0,
    lendersRepaid: 0,
    creatorPaid: 0,
    tailQuarters: 0,
    tailReceived: 0,
    accPerWeight: 0,
    totalWeight: 0,
    helioEarned: 0,
    installerEarned: 0,
    createdAt: a.now,
  };
  const s2 = { ...s1, notes: [...s1.notes, note] };
  return {
    state: logTx(s2, "create_note", creator, `${note.name} · ${a.kwDc} kW-DC + ${a.batteryKwh} kWh · paid ${fmt(fee)} USDC application fee · auction open`, a.now),
    note,
  };
}

export function deposit(s: LedgerState, a: { lender: Address; noteId: string; amount: number; now: number }): LedgerState {
  const n = getNote(s, a.noteId);
  if (n.failed || n.stage !== 1) fail("AuctionClosed", `${n.name} is no longer taking deposits.`);
  if (!(a.amount > 0)) fail("BadAmount", "Deposit must be positive.");
  const room = remaining(n);
  const amt = Math.min(a.amount, room);
  let st = debit(s, a.lender, amt, "Deposit");
  const apr = liveApr(n, a.now);
  const mult = liveWeight(n, a.now);
  let note: HelioNote = {
    ...n,
    deposits: { ...n.deposits, [a.lender]: (n.deposits[a.lender] ?? 0) + amt },
    aprDollars: { ...(n.aprDollars ?? {}), [a.lender]: (n.aprDollars?.[a.lender] ?? 0) + amt * apr },
    weightDollars: { ...(n.weightDollars ?? {}), [a.lender]: (n.weightDollars?.[a.lender] ?? 0) + amt * mult },
  };
  let detail = `Deposited ${fmt(amt)} USDC into ${n.name} at ${(apr * 100).toFixed(2)}% APR, ${mult.toFixed(2)}x tail weight`;
  if (room - amt < EPS) {
    note = { ...note, stage: 2, clearingApr: apr, fundedAt: a.now };
    detail += ` → filled, clearing APR ${(apr * 100).toFixed(2)}%`;
    st = put(st, note);
    st = mintNfts(st, note);
    return logTx(st, "deposit", a.lender, detail, a.now);
  }
  return logTx(put(st, note), "deposit", a.lender, detail, a.now);
}

function mintNfts(s: LedgerState, n: HelioNote): LedgerState {
  let st = s;
  const minted: YieldNft[] = [];
  // NFT weight = principal × the lender's blended early-funder multiplier (1.8x → 1x).
  const entries: Array<[Address, number, YieldNft["kind"]]> = Object.entries(n.deposits)
    .filter(([, v]) => v > EPS)
    .map(([k, v]) => [k, v * lenderWeight(n, k), "lender"]);
  entries.push([n.creator, n.applicationFee * CREATOR_YIELD_MULTIPLE, "creator"]);
  for (const [owner, weight, kind] of entries) {
    const [id, s1] = nextId(st, "ynft");
    st = s1;
    minted.push({ id, noteId: n.id, owner, weight, kind, claimed: 0, listPrice: null });
  }
  const totalWeight = minted.reduce((a, b) => a + b.weight, 0);
  return put({ ...st, nfts: [...st.nfts, ...minted] }, { ...n, totalWeight });
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
  const deposits = { ...n.deposits, [a.lender]: held - amt };
  // Withdrawals shrink APR and weight pro-rata, keeping the lender's blended rate.
  const keep = held > EPS ? (held - amt) / held : 0;
  const aprDollars = { ...(n.aprDollars ?? {}), [a.lender]: (n.aprDollars?.[a.lender] ?? held * liveApr(n, a.now)) * keep };
  const weightDollars = { ...(n.weightDollars ?? {}), [a.lender]: (n.weightDollars?.[a.lender] ?? held) * keep };
  if ((deposits[a.lender] ?? 0) < EPS) {
    delete deposits[a.lender];
    delete aprDollars[a.lender];
    delete weightDollars[a.lender];
  }
  const stayers = Object.entries(deposits);
  const stayTotal = stayers.reduce((x, [, v]) => x + v, 0);
  const exitBonus = { ...n.exitBonus };
  let protocolCut = toProtocol;
  if (stayTotal > EPS) {
    for (const [who, v] of stayers) exitBonus[who] = (exitBonus[who] ?? 0) + (toStayers * v) / stayTotal;
  } else protocolCut += toStayers;
  let st = put(s, { ...n, deposits, exitBonus });
  st = credit(st, a.lender, refund);
  st = credit(st, st.config.treasury, protocolCut);
  return logTx(st, "withdraw", a.lender, `Withdrew ${fmt(amt)} from ${n.name}: ${fmt(refund)} back, ${fmt(toStayers)} to stayers, ${fmt(toProtocol)} protocol`, a.now);
}

export function failNote(s: LedgerState, signer: Address, noteId: string, now: number): LedgerState {
  requireAdmin(s, signer, "fail_note");
  const n = getNote(s, noteId);
  if (n.stage !== 1 || n.failed) fail("NotInAuction", "Only an open auction can be failed.");
  let st = s;
  for (const [who, v] of Object.entries(n.deposits)) st = credit(st, who, v + (n.exitBonus[who] ?? 0));
  // Bonus owed to lenders who fully exited was funded from exit fees; pay those too.
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
  return logTx(put(s, { ...n, stage: 4 }), "mark_pto", signer, `${n.name} received Ameren Permission to Operate`, now);
}

/** Takeout waterfall: lenders P+I → creator 3x cash → surplus to HELIO. */
export function recordTakeout(s: LedgerState, signer: Address, noteId: string, amount: number, now: number): LedgerState {
  requireAdmin(s, signer, "record_takeout");
  const n = getNote(s, noteId);
  if (n.stage !== 4) fail("WrongStage", `${n.name} needs PTO before takeout.`);
  if (!(amount > 0)) fail("BadAmount", "Takeout must be positive.");
  const due = lenderDue(n, now);
  const lendersPay = Math.min(amount, due.total);
  let left = amount - lendersPay;
  const creatorPay = Math.min(left, n.applicationFee * CREATOR_CASH_MULTIPLE);
  left -= creatorPay;
  let st = s;
  const ratio = due.total > 0 ? lendersPay / due.total : 0;
  for (const [who, v] of Object.entries(n.deposits)) {
    const owed = v + noteInterest(v, lenderApr(n, who), lockupDays(n, now));
    st = credit(st, who, owed * ratio + (n.exitBonus[who] ?? 0));
  }
  st = credit(st, n.creator, creatorPay);
  st = credit(st, st.config.treasury, left);
  st = put(st, { ...n, stage: 5, takeoutReceived: amount, lendersRepaid: lendersPay, creatorPaid: creatorPay, helioEarned: n.helioEarned + left });
  const short_ = lendersPay + EPS < due.total ? ` (short ${fmt(due.total - lendersPay)})` : "";
  return logTx(st, "record_takeout", signer, `${n.name} takeout ${fmt(amount)}: lenders ${fmt(lendersPay)}${short_}, creator ${fmt(creatorPay)}, HELIO ${fmt(left)}`, now);
}

export function recordTail(s: LedgerState, signer: Address, noteId: string, amount: number, now: number): LedgerState {
  requireAdmin(s, signer, "record_tail");
  const n = getNote(s, noteId);
  if (n.stage < 5 || n.stage > 6) fail("WrongStage", `${n.name} starts its tail after takeout.`);
  if (!(amount > 0)) fail("BadAmount", "Tail payment must be positive.");
  const toYield = amount * TAIL_TO_YIELD;
  const toHelio = amount * TAIL_TO_HELIO;
  const toInstaller = amount * TAIL_TO_INSTALLER;
  let st = credit(s, s.config.treasury, toHelio);
  st = credit(st, st.config.installer, toInstaller);
  const q = n.tailQuarters + 1;
  st = put(st, {
    ...n,
    stage: q >= TAIL_QUARTERS ? 7 : 6,
    tailQuarters: q,
    tailReceived: n.tailReceived + amount,
    accPerWeight: n.accPerWeight + (n.totalWeight > 0 ? toYield / n.totalWeight : 0),
    helioEarned: n.helioEarned + toHelio,
    installerEarned: n.installerEarned + toInstaller,
  });
  return logTx(st, "record_tail", signer, `${n.name} Q${q} tail ${fmt(amount)}: ${fmt(toYield)} Yield NFTs, ${fmt(toHelio)} HELIO, ${fmt(toInstaller)} installer`, now);
}

function getNft(s: LedgerState, id: string) {
  return s.nfts.find((x) => x.id === id) ?? fail("NftNotFound", `Yield NFT ${id} does not exist.`);
}
function putNft(s: LedgerState, x: YieldNft): LedgerState {
  return { ...s, nfts: s.nfts.map((y) => (y.id === x.id ? x : y)) };
}

export function claimNft(s: LedgerState, owner: Address, nftId: string, now: number): { state: LedgerState; amount: number } {
  const nft = getNft(s, nftId);
  if (nft.owner !== owner) fail("NotOwner", "You don't hold this Yield NFT.");
  const n = getNote(s, nft.noteId);
  const amount = nftClaimable(n, nft);
  if (amount < 0.005) fail("NothingToClaim", "Nothing to claim yet.");
  let st = putNft(s, { ...nft, claimed: nft.claimed + amount });
  st = credit(st, owner, amount);
  return { state: logTx(st, "claim", owner, `Claimed ${fmt(amount)} USDC from ${nft.id} (${n.name})`, now), amount };
}

export function listNft(s: LedgerState, owner: Address, nftId: string, price: number | null, now: number): LedgerState {
  const nft = getNft(s, nftId);
  if (nft.owner !== owner) fail("NotOwner", "You don't hold this Yield NFT.");
  if (price !== null && !(price > 0)) fail("BadPrice", "Price must be positive.");
  const st = putNft(s, { ...nft, listPrice: price });
  return logTx(st, price === null ? "delist" : "list", owner, price === null ? `Delisted ${nft.id}` : `Listed ${nft.id} for ${fmt(price)} USDC`, now);
}

/** Unclaimed cash travels with the NFT. */
export function buyNft(s: LedgerState, buyer: Address, nftId: string, now: number): LedgerState {
  const nft = getNft(s, nftId);
  if (nft.listPrice === null) fail("NotListed", "This Yield NFT isn't for sale.");
  if (nft.owner === buyer) fail("OwnListing", "You already own this NFT.");
  let st = debit(s, buyer, nft.listPrice!, "Buy Yield NFT");
  st = credit(st, nft.owner, nft.listPrice!);
  st = putNft(st, { ...nft, owner: buyer, listPrice: null });
  return logTx(st, "buy_nft", buyer, `Bought ${nft.id} from ${short(nft.owner)} for ${fmt(nft.listPrice!)} USDC`, now);
}

export type { Stage };
