/**
 * HELIO ledger — a pure TypeScript mirror of the Anchor program in /programs/helio.
 * Instructions: faucet, buy_panels, originate_project, bond_panels (burn), admin_set_gate,
 * record_takeout_payment, claim.
 *
 * All amounts are USDC floats in the UI layer; the program uses u64 micro-USDC.
 */
import { ORIGINATOR_TAIL_BPS, PANEL_PRICE_USDC } from "./constants";
import { fundingTarget, panelsRequired } from "./panels";
import { computeTakeout, type ProjectSpecs } from "./takeout";
import type { Address, Bond, Gate, HelioProject, LedgerState, Payout, PayoutKind, ProjectStatus, TxLogEntry } from "./types";

export class HelioError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "HelioError";
  }
}

const fail = (code: string, message: string): never => {
  throw new HelioError(code, message);
};

function nextId(state: LedgerState, prefix: string): [string, LedgerState] {
  const counter = state.counter + 1;
  return [`${prefix}-${counter.toString().padStart(3, "0")}`, { ...state, counter }];
}

function logTx(state: LedgerState, ix: string, signer: Address, detail: string, at: number): LedgerState {
  const entry: TxLogEntry = { id: `tx-${state.counter}-${state.log.length}`, at, ix, signer, detail };
  return { ...state, log: [entry, ...state.log].slice(0, 200) };
}

export const short = (a: Address) => (a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);
export const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function balanceOf(state: LedgerState, who: Address): number {
  return state.balances[who] ?? 0;
}
export function panelsOf(state: LedgerState, who: Address): number {
  return state.panels[who] ?? 0;
}

function credit(state: LedgerState, who: Address, amount: number): LedgerState {
  return { ...state, balances: { ...state.balances, [who]: balanceOf(state, who) + amount } };
}

function debit(state: LedgerState, who: Address, amount: number, what: string): LedgerState {
  const bal = balanceOf(state, who);
  if (bal + 1e-9 < amount) {
    fail("InsufficientFunds", `${what}: wallet ${short(who)} holds ${fmt(bal)} USDC but ${fmt(amount)} USDC is required. Use the faucet.`);
  }
  return { ...state, balances: { ...state.balances, [who]: bal - amount } };
}

export function getProject(state: LedgerState, id: string): HelioProject {
  return state.projects.find((p) => p.id === id) ?? fail("ProjectNotFound", `Project ${id} does not exist.`);
}

function replace(list: HelioProject[], item: HelioProject): HelioProject[] {
  return list.map((x) => (x.id === item.id ? item : x));
}

function requireAdmin(state: LedgerState, signer: Address, ix: string): void {
  if (signer !== state.config.admin) {
    fail("Unauthorized", `${ix} is admin-only. Load the oracle admin wallet from the header menu.`);
  }
}

/* ── views ────────────────────────────────────────────────────────── */

export function projectStatus(p: HelioProject): ProjectStatus {
  if (p.panelsBonded < p.panelsRequired) return "Bonding";
  if (p.gate >= 7) return "Complete";
  if (p.payouts.some((x) => x.kind === "rec" || x.kind === "tail")) return "Paying";
  if (p.gate >= 3) return "Energized";
  return "Funded";
}

export function bondedPanels(state: LedgerState, projectId: string, holder: Address): number {
  return state.bonds.filter((b) => b.projectId === projectId && b.holder === holder).reduce((s, b) => s + b.panels, 0);
}

/** Share of the project held by this wallet, 0…1 (panels burned ÷ panels required). */
export function sharePct(state: LedgerState, p: HelioProject, holder: Address): number {
  return bondedPanels(state, p.id, holder) / p.panelsRequired;
}

export function distributedToShares(p: HelioProject): number {
  return p.payouts.reduce((s, x) => s + x.toShares, 0);
}

export function claimable(state: LedgerState, p: HelioProject, holder: Address): number {
  const entitled = distributedToShares(p) * sharePct(state, p, holder);
  return Math.max(0, entitled - (p.claims[holder] ?? 0));
}

export function holders(state: LedgerState, p: HelioProject): Array<{ holder: Address; panels: number; pct: number; claimed: number; claimable: number }> {
  const map = new Map<Address, number>();
  for (const b of state.bonds.filter((x) => x.projectId === p.id)) {
    map.set(b.holder, (map.get(b.holder) ?? 0) + b.panels);
  }
  return [...map.entries()]
    .map(([holder, panels]) => ({
      holder,
      panels,
      pct: panels / p.panelsRequired,
      claimed: p.claims[holder] ?? 0,
      claimable: claimable(state, p, holder),
    }))
    .sort((a, b) => b.panels - a.panels);
}

/* ── instructions ─────────────────────────────────────────────────── */

export function faucet(state: LedgerState, who: Address, amount: number, now: number): LedgerState {
  return logTx(credit(state, who, amount), "faucet", who, `+${fmt(amount)} USDC-dev to ${short(who)}`, now);
}

/** buy_panels: transfers USDC to treasury and mints `count` Helio Panels (Token-2022) to the buyer. */
export function buyPanels(state: LedgerState, a: { buyer: Address; count: number; now: number }): { state: LedgerState; cost: number } {
  if (!Number.isInteger(a.count) || a.count <= 0) {
    fail("BadPanelCount", "Panel count must be a whole number greater than zero.");
  }
  if (a.count > state.shopStock) {
    fail("OutOfStock", `Only ${state.shopStock} panels remain in this mint. Reduce the quantity.`);
  }
  const cost = a.count * PANEL_PRICE_USDC;
  let s = debit(state, a.buyer, cost, "Buy panels");
  s = credit(s, s.config.treasury, cost);
  s = {
    ...s,
    shopStock: s.shopStock - a.count,
    panelsMinted: s.panelsMinted + a.count,
    panels: { ...s.panels, [a.buyer]: panelsOf(s, a.buyer) + a.count },
  };
  return { state: logTx(s, "buy_panels", a.buyer, `Minted ${a.count} Helio 400W panel${a.count > 1 ? "s" : ""} for ${fmt(cost)} USDC`, a.now), cost };
}

export interface OriginateArgs {
  name: string;
  city: string;
  address: string;
  rateClass: "DS-1" | "DS-2";
  specs: ProjectSpecs;
  tradeDate: number;
  gate?: Gate;
  now: number;
}

/** originate_project: HELIO publishes an underwritten job open for bonding. */
export function originateProject(state: LedgerState, signer: Address, a: OriginateArgs): { state: LedgerState; project: HelioProject } {
  requireAdmin(state, signer, "originate_project");
  if (!a.name.trim()) fail("BadName", "Project needs a site name.");
  const takeout = computeTakeout(a.specs);
  const [id, s1] = nextId(state, "job");
  const project: HelioProject = {
    id,
    name: a.name.trim(),
    city: a.city.trim(),
    address: a.address.trim(),
    utility: "Ameren Illinois",
    rateClass: a.rateClass,
    tradeDate: a.tradeDate,
    energizationDeadline: a.tradeDate + 18 * 30 * 86400,
    specs: a.specs,
    takeout,
    fundingTarget: fundingTarget(a.specs.kwDc),
    panelsRequired: panelsRequired(a.specs.kwDc),
    panelsBonded: 0,
    gate: a.gate ?? 2,
    payouts: [],
    claims: {},
    originatorEarned: 0,
    createdAt: a.now,
  };
  const s2 = { ...s1, projects: [...s1.projects, project] };
  return {
    state: logTx(s2, "originate_project", signer, `${project.name} · ${a.specs.kwDc} kW-DC · target ${fmt(project.fundingTarget)} USDC · ${project.panelsRequired} panels`, a.now),
    project,
  };
}

/** bond_panels: burns panels permanently and mints a Project Share = panels ÷ panels_required. */
export function bondPanels(state: LedgerState, a: { holder: Address; projectId: string; panels: number; now: number }): { state: LedgerState; bond: Bond } {
  const p = getProject(state, a.projectId);
  if (!Number.isInteger(a.panels) || a.panels <= 0) fail("BadPanelCount", "Bond a whole number of panels.");
  const held = panelsOf(state, a.holder);
  if (a.panels > held) fail("NotEnoughPanels", `You hold ${held} unbonded panel${held === 1 ? "" : "s"}. Buy more in the shop.`);
  const room = p.panelsRequired - p.panelsBonded;
  if (room <= 0) fail("ProjectFullyBonded", `${p.name} is fully bonded. Pick another project.`);
  if (a.panels > room) fail("OverBond", `${p.name} needs only ${room} more panel${room === 1 ? "" : "s"}.`);

  const [bondId, s1] = nextId(state, "bond");
  const bond: Bond = { id: bondId, projectId: p.id, holder: a.holder, panels: a.panels, at: a.now };
  const updated: HelioProject = { ...p, panelsBonded: p.panelsBonded + a.panels };
  const s2: LedgerState = {
    ...s1,
    panels: { ...s1.panels, [a.holder]: held - a.panels },
    panelsBurned: s1.panelsBurned + a.panels,
    bonds: [...s1.bonds, bond],
    projects: replace(s1.projects, updated),
  };
  const pctNow = (a.panels / p.panelsRequired) * 100;
  return {
    state: logTx(
      s2,
      "bond_panels",
      a.holder,
      `Burned ${a.panels} panel${a.panels > 1 ? "s" : ""} into ${p.name} → ${pctNow.toFixed(2)}% Project Share (${updated.panelsBonded}/${p.panelsRequired} bonded)`,
      a.now,
    ),
    bond,
  };
}

export function adminSetGate(state: LedgerState, signer: Address, projectId: string, gate: Gate, now: number): LedgerState {
  requireAdmin(state, signer, "admin_set_gate");
  const p = getProject(state, projectId);
  if (gate > 2 && p.panelsBonded < p.panelsRequired) {
    fail("NotFunded", `${p.name} is only ${p.panelsBonded}/${p.panelsRequired} bonded. A job must be fully funded before it energizes.`);
  }
  const s = { ...state, projects: replace(state.projects, { ...p, gate }) };
  return logTx(s, "admin_set_gate", signer, `${p.name} → G${gate}`, now);
}

/**
 * record_takeout_payment: real takeout USDC lands and is split to Project Shares.
 * Rebate and first REC payments go 100% to shares; the 6-year tail splits 80/20 with HELIO.
 */
export function recordTakeoutPayment(
  state: LedgerState,
  a: { signer: Address; projectId: string; kind: PayoutKind; amount: number; memo: string; now: number },
): LedgerState {
  requireAdmin(state, a.signer, "record_takeout_payment");
  const p = getProject(state, a.projectId);
  if (a.amount <= 0) fail("BadAmount", "Payment amount must be positive.");
  if (p.panelsBonded < p.panelsRequired) fail("NotFunded", `${p.name} is not fully bonded — no shares exist to pay yet.`);

  const toOriginator = a.kind === "tail" ? (a.amount * ORIGINATOR_TAIL_BPS) / 10_000 : 0;
  const toShares = a.amount - toOriginator;
  const [payoutId, s1] = nextId(state, "pay");
  const payout: Payout = { id: payoutId, kind: a.kind, amount: a.amount, toShares, toOriginator, at: a.now, memo: a.memo };
  const gateFloor: Gate = a.kind === "rebate" ? 4 : a.kind === "rec" ? 6 : p.gate;
  const updated: HelioProject = {
    ...p,
    payouts: [...p.payouts, payout],
    originatorEarned: p.originatorEarned + toOriginator,
    gate: (Math.max(p.gate, gateFloor) as Gate),
  };
  let s = { ...s1, projects: replace(s1.projects, updated) };
  if (toOriginator > 0) s = credit(s, s.config.treasury, toOriginator);
  const label = a.kind === "rebate" ? "Ameren rebate" : a.kind === "rec" ? "First REC payment" : "REC tail quarter";
  return logTx(s, "record_takeout_payment", a.signer, `${label} ${fmt(a.amount)} USDC on ${p.name} → ${fmt(toShares)} to shares${toOriginator ? `, ${fmt(toOriginator)} originator` : ""}`, a.now);
}

/** claim: pulls a holder's pro-rata share of everything distributed so far. */
export function claim(state: LedgerState, a: { holder: Address; projectId: string; now: number }): { state: LedgerState; amount: number } {
  const p = getProject(state, a.projectId);
  const amount = claimable(state, p, a.holder);
  if (amount <= 0.000001) {
    fail("NothingToClaim", `${short(a.holder)} has nothing claimable on ${p.name} yet.`);
  }
  const updated: HelioProject = { ...p, claims: { ...p.claims, [a.holder]: (p.claims[a.holder] ?? 0) + amount } };
  let s: LedgerState = { ...state, projects: replace(state.projects, updated) };
  s = credit(s, a.holder, amount);
  return { state: logTx(s, "claim", a.holder, `Claimed ${fmt(amount)} USDC from ${p.name}`, a.now), amount };
}
