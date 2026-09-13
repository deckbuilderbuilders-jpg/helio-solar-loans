/**
 * HELIO ledger — a pure TypeScript mirror of the Anchor program in /programs/helio.
 * Every function here corresponds 1:1 to an instruction and enforces the same checks,
 * so the UI, the tests and the on-chain program share one state machine.
 *
 * All amounts are USDC floats in the UI layer; the program uses u64 micro-USDC with
 * the identical integer formula (see interestMicro in takeout.ts).
 */
import {
  EXTENSION_PENALTY_BPS,
  EXTENSION_SECONDS,
  GRACE_SECONDS,
  OFFER_GRID,
} from "./constants";
import { computeTakeout, interestFor, lendable, type ProjectSpecs } from "./takeout";
import type {
  Address,
  Collection,
  EscrowPayment,
  Gate,
  LedgerState,
  Loan,
  Offer,
  Project,
  TxLogEntry,
} from "./types";

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

export function balanceOf(state: LedgerState, who: Address): number {
  return state.balances[who] ?? 0;
}

function credit(state: LedgerState, who: Address, amount: number): LedgerState {
  return { ...state, balances: { ...state.balances, [who]: balanceOf(state, who) + amount } };
}

function debit(state: LedgerState, who: Address, amount: number, what: string): LedgerState {
  const bal = balanceOf(state, who);
  if (bal + 1e-9 < amount) {
    fail(
      "InsufficientFunds",
      `${what}: wallet ${short(who)} holds ${fmt(bal)} USDC but ${fmt(amount)} USDC is required. Use the faucet.`,
    );
  }
  return { ...state, balances: { ...state.balances, [who]: bal - amount } };
}

export const short = (a: Address) => (a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);
export const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function getCollection(state: LedgerState, slug: string): Collection {
  return state.collections.find((c) => c.slug === slug) ?? fail("CollectionNotFound", `Collection ${slug} does not exist.`);
}
export function getOffer(state: LedgerState, id: string): Offer {
  return state.offers.find((o) => o.id === id) ?? fail("OfferNotFound", `Offer ${id} does not exist.`);
}
export function getProject(state: LedgerState, id: string): Project {
  return state.projects.find((p) => p.id === id) ?? fail("ProjectNotFound", `Project ${id} does not exist.`);
}
export function getLoan(state: LedgerState, id: string): Loan {
  return state.loans.find((l) => l.id === id) ?? fail("LoanNotFound", `Loan ${id} does not exist.`);
}

function replace<T extends { id: string }>(list: T[], item: T): T[] {
  return list.map((x) => (x.id === item.id ? item : x));
}

/** Fixed-term interest owed for the whole term (Sharky semantics: term interest is due regardless of early repay). */
export function interestDue(loan: Loan): number {
  const base = interestFor(loan.principal, loan.apyBps, loan.termSeconds);
  const ext = loan.extended
    ? interestFor(loan.principal, loan.apyBps + EXTENSION_PENALTY_BPS, EXTENSION_SECONDS)
    : 0;
  return base + ext;
}

/** Interest accrued so far — display only. */
export function interestAccrued(loan: Loan, now: number): number {
  const elapsed = Math.max(0, Math.min(now, loan.expiresAt) - loan.startAt);
  return interestFor(loan.principal, loan.apyBps, elapsed);
}

export function totalDue(loan: Loan): number {
  return loan.principal + interestDue(loan);
}
export function outstanding(loan: Loan): number {
  return Math.max(0, totalDue(loan) - loan.principalRepaid - loan.interestPaid - loan.protocolCutPaid);
}
export function isPastGrace(loan: Loan, now: number): boolean {
  return now > loan.expiresAt + GRACE_SECONDS;
}
export function isExpired(loan: Loan, now: number): boolean {
  return now > loan.expiresAt;
}

/** Which collection does a spec sheet belong to? */
export function matchCollection(collections: Collection[], specs: ProjectSpecs): Collection {
  const hasBattery = specs.batteryKwh > 0;
  const match = collections.find(
    (c) =>
      specs.kwAc > c.minKwAc &&
      specs.kwAc <= c.maxKwAc &&
      (c.requiresBattery === null || c.requiresBattery === hasBattery),
  );
  return match ?? fail("NoCollection", `No collection accepts a ${specs.kwAc} kW AC project.`);
}

/** LTV cap = min(collection cap, gate-grid cap). G2 70% · G3 80% · G4 88%. */
export function ltvCapBps(col: Collection, gate: Gate): number {
  const row = OFFER_GRID.find((g) => g.gate === Math.min(4, Math.max(2, gate)));
  return Math.min(col.ltvBps, row ? row.ltvBps : col.ltvBps);
}

// ───────────────────────── instructions ─────────────────────────

export function faucet(state: LedgerState, wallet: Address, amount: number, now: number): LedgerState {
  if (amount <= 0) fail("BadAmount", "Faucet amount must be positive.");
  return logTx(credit(state, wallet, amount), "faucet", wallet, `Minted ${fmt(amount)} USDC-dev`, now);
}

export interface PostOfferArgs {
  lender: Address;
  collection: string;
  principal: number;
  apyBps: number;
  originationBps: number;
  termSeconds: number;
  minGate: Gate;
  offerTtlSeconds?: number;
  now: number;
}

export function postOffer(state: LedgerState, a: PostOfferArgs): { state: LedgerState; offer: Offer } {
  const col = getCollection(state, a.collection);
  if (a.principal < 100) fail("BadAmount", "Minimum offer is 100 USDC.");
  if (a.apyBps < 100 || a.apyBps > 10_000) fail("BadApy", "APY must be between 1% and 100%.");
  if (a.minGate < col.gateMin) {
    fail("GateBelowCollection", `Collection ${col.slug} requires gate ≥ G${col.gateMin}; offer minimum gate is G${a.minGate}.`);
  }
  if (a.minGate < 2 || a.minGate > 4) fail("GateNotOriginatable", "Loans may only originate at G2, G3 or G4 in v1.");
  let s = debit(state, a.lender, a.principal, "post_offer");
  let id: string;
  [id, s] = nextId(s, "offer");
  const offer: Offer = {
    id,
    lender: a.lender,
    collection: a.collection,
    principal: a.principal,
    apyBps: a.apyBps,
    originationBps: a.originationBps,
    termSeconds: a.termSeconds,
    minGate: a.minGate,
    createdAt: a.now,
    expiresAt: a.now + (a.offerTtlSeconds ?? 30 * 86400),
    state: "Open",
  };
  s = { ...s, offers: [offer, ...s.offers] };
  return {
    state: logTx(s, "post_offer", a.lender, `${fmt(a.principal)} USDC on ${a.collection} @ ${a.apyBps / 100}% for ${a.termSeconds / 86400}d`, a.now),
    offer,
  };
}

export function cancelOffer(state: LedgerState, lender: Address, offerId: string, now: number): LedgerState {
  const offer = getOffer(state, offerId);
  if (offer.lender !== lender) fail("Unauthorized", "Only the lender who posted an offer may cancel it.");
  if (offer.state !== "Open") fail("OfferNotOpen", `Offer ${offerId} is ${offer.state}.`);
  let s = credit(state, lender, offer.principal);
  s = { ...s, offers: replace(s.offers, { ...offer, state: "Cancelled" }) };
  return logTx(s, "cancel_offer", lender, `Cancelled ${offerId}, ${fmt(offer.principal)} USDC returned`, now);
}

export interface ListProjectArgs {
  borrower: Address;
  name: string;
  address: string;
  rateClass: "DS-1" | "DS-2";
  specs: ProjectSpecs;
  gate?: Gate;
  tradeDate?: number;
  now: number;
}

export function listProject(state: LedgerState, a: ListProjectArgs): { state: LedgerState; project: Project } {
  const takeout = computeTakeout(a.specs);
  const col = matchCollection(state.collections, a.specs);
  let s = state;
  let id: string;
  [id, s] = nextId(s, "proj");
  const tradeDate = a.tradeDate ?? a.now;
  const project: Project = {
    id,
    borrower: a.borrower,
    collection: col.slug,
    name: a.name,
    address: a.address,
    utility: "Ameren Illinois",
    rateClass: a.rateClass,
    tradeDate,
    // Illinois Shines: 18 months from Trade Date to energize (Small DG).
    energizationDeadline: tradeDate + 18 * 30 * 86400,
    specs: a.specs,
    takeout,
    gate: a.gate ?? 0,
    noteMint: `note${id.replace("proj-", "")}${a.borrower.slice(0, 6)}`,
    noteFrozen: false,
    noteOwner: a.borrower,
    activeLoanId: null,
    createdAt: a.now,
  };
  s = { ...s, projects: [project, ...s.projects] };
  return {
    state: logTx(s, "list_project", a.borrower, `Minted Project Note for ${a.name} (${col.slug}), takeout ${fmt(takeout.takeout)} USDC`, a.now),
    project,
  };
}

export function acceptOffer(
  state: LedgerState,
  a: { borrower: Address; offerId: string; projectId: string; now: number },
): { state: LedgerState; loan: Loan } {
  const offer = getOffer(state, a.offerId);
  const project = getProject(state, a.projectId);
  const col = getCollection(state, offer.collection);
  if (project.borrower !== a.borrower) fail("Unauthorized", "Only the project's Approved Vendor may accept an offer against it.");
  if (offer.state !== "Open") fail("OfferNotOpen", `Offer ${offer.id} is ${offer.state}.`);
  if (offer.expiresAt < a.now) fail("OfferExpired", `Offer ${offer.id} expired.`);
  if (project.collection !== offer.collection) {
    fail("CollectionMismatch", `Project is in ${project.collection}; offer is for ${offer.collection}.`);
  }
  if (project.gate < offer.minGate) {
    fail("GateTooLow", `Project is at G${project.gate}; this offer requires G${offer.minGate}. Advance the milestone in the oracle panel.`);
  }
  if (project.gate >= 7) fail("ProjectClosed", "This project has already been repaid.");
  if (project.activeLoanId) fail("NoteFrozen", "Project Note is already frozen by a live loan.");
  const capBps = ltvCapBps(col, project.gate);
  const cap = lendable(project.takeout.takeout, capBps);
  if (offer.principal > cap + 1e-6) {
    fail("ExceedsLtv", `Offer principal ${fmt(offer.principal)} exceeds lendable ${fmt(cap)} USDC (${capBps / 100}% LTV of ${fmt(project.takeout.takeout)} takeout).`);
  }

  const origination = (offer.principal * offer.originationBps) / 10_000;
  let s = state;
  let id: string;
  [id, s] = nextId(s, "loan");
  const loan: Loan = {
    id,
    offerId: offer.id,
    projectId: project.id,
    lender: offer.lender,
    borrower: a.borrower,
    collection: offer.collection,
    principal: offer.principal,
    apyBps: offer.apyBps,
    originationBps: offer.originationBps,
    originationPaid: origination,
    startAt: a.now,
    expiresAt: a.now + offer.termSeconds,
    termSeconds: offer.termSeconds,
    extended: false,
    state: "Active",
    escrowBalance: 0,
    payments: [],
    principalRepaid: 0,
    interestPaid: 0,
    protocolCutPaid: 0,
    residualToBorrower: 0,
    closedAt: null,
  };
  // USDC: offer vault → borrower, origination → treasury (taken at origination).
  s = credit(s, a.borrower, offer.principal - origination);
  s = { ...s, config: { ...s.config, treasuryBalance: s.config.treasuryBalance + origination } };
  s = {
    ...s,
    offers: replace(s.offers, { ...offer, state: "Taken" }),
    projects: replace(s.projects, { ...project, noteFrozen: true, activeLoanId: id }),
    loans: [loan, ...s.loans],
  };
  return {
    state: logTx(s, "accept_offer", a.borrower, `Loan ${id}: ${fmt(offer.principal)} USDC, note ${short(project.noteMint)} frozen`, a.now),
    loan,
  };
}

export function adminSetGate(state: LedgerState, admin: Address, projectId: string, gate: Gate, now: number): LedgerState {
  if (admin !== state.config.admin) fail("Unauthorized", "Only the milestone oracle (admin) can set gates.");
  const project = getProject(state, projectId);
  if (gate === 7) fail("GateReserved", "G7 is set by the program on repay, not by the oracle.");
  const s = { ...state, projects: replace(state.projects, { ...project, gate }) };
  return logTx(s, "admin_set_gate", admin, `${project.name} → G${gate}`, now);
}

export function recordTakeoutPayment(
  state: LedgerState,
  a: { signer: Address; loanId: string; kind: "rebate" | "rec"; amount: number; memo: string; now: number },
): LedgerState {
  const loan = getLoan(state, a.loanId);
  if (loan.state !== "Active" && loan.state !== "Extended") fail("LoanClosed", `Loan ${loan.id} is ${loan.state}.`);
  if (a.amount <= 0) fail("BadAmount", "Payment must be positive.");
  const payment: EscrowPayment = { id: `pay-${loan.payments.length + 1}`, kind: a.kind, amount: a.amount, at: a.now, memo: a.memo };
  let s = { ...state, loans: replace(state.loans, { ...loan, escrowBalance: loan.escrowBalance + a.amount, payments: [...loan.payments, payment] }) };
  // Oracle side effect: a rebate credit implies G5, a REC payment implies G6.
  const project = getProject(s, loan.projectId);
  const impliedGate: Gate = a.kind === "rebate" ? 5 : 6;
  if (project.gate < impliedGate) s = { ...s, projects: replace(s.projects, { ...project, gate: impliedGate }) };
  return logTx(s, "record_takeout_payment", a.signer, `${a.kind === "rebate" ? "Ameren rebate" : "REC invoice"} ${fmt(a.amount)} USDC → escrow ${loan.id}`, a.now);
}

/**
 * Waterfall: escrow (and optional wallet top-up) → principal → interest (net of 10% protocol cut) → residual to borrower.
 * Partial prepay allowed: the loan stays open until principal + full-term interest are covered.
 */
export function repay(
  state: LedgerState,
  a: { signer: Address; loanId: string; walletAmount: number; now: number },
): { state: LedgerState; loan: Loan } {
  const loan = getLoan(state, a.loanId);
  if (loan.state !== "Active" && loan.state !== "Extended") fail("LoanClosed", `Loan ${loan.id} is ${loan.state}.`);
  if (a.walletAmount < 0) fail("BadAmount", "Repay amount cannot be negative.");
  if (a.walletAmount > 0 && a.signer !== loan.borrower) fail("Unauthorized", "Only the borrower can repay from wallet.");
  let s = state;
  if (a.walletAmount > 0) s = debit(s, a.signer, a.walletAmount, "repay");
  let available = loan.escrowBalance + a.walletAmount;
  if (available <= 0) fail("NothingToRepay", "Escrow is empty and no wallet amount was supplied.");

  const due = interestDue(loan);
  let principalRepaid = loan.principalRepaid;
  let interestPaid = loan.interestPaid;
  let protocolCutPaid = loan.protocolCutPaid;
  let lenderReceives = 0;

  // 1. principal
  const principalGap = loan.principal - principalRepaid;
  const p = Math.min(principalGap, available);
  principalRepaid += p;
  lenderReceives += p;
  available -= p;
  // 2. interest net of protocol cut
  const interestGap = due - interestPaid - protocolCutPaid;
  const i = Math.min(interestGap, available);
  const cut = (i * s.config.protocolFeeBps) / 10_000;
  protocolCutPaid += cut;
  interestPaid += i - cut;
  lenderReceives += i - cut;
  available -= i;
  // 3. residual to borrower
  const residual = available;

  s = credit(s, loan.lender, lenderReceives);
  if (residual > 0) s = credit(s, loan.borrower, residual);
  s = { ...s, config: { ...s.config, treasuryBalance: s.config.treasuryBalance + cut } };

  const fullyRepaid = principalRepaid >= loan.principal - 1e-6 && interestPaid + protocolCutPaid >= due - 1e-6;
  const updated: Loan = {
    ...loan,
    escrowBalance: 0,
    principalRepaid,
    interestPaid,
    protocolCutPaid,
    residualToBorrower: loan.residualToBorrower + residual,
    state: fullyRepaid ? "Repaid" : loan.state,
    closedAt: fullyRepaid ? a.now : null,
  };
  s = { ...s, loans: replace(s.loans, updated) };
  if (fullyRepaid) {
    const project = getProject(s, loan.projectId);
    s = { ...s, projects: replace(s.projects, { ...project, gate: 7, noteFrozen: false, activeLoanId: null }) };
  }
  return {
    state: logTx(s, "repay", a.signer, `${loan.id}: lender +${fmt(lenderReceives)}, protocol +${fmt(cut)}, residual ${fmt(residual)} → borrower${fullyRepaid ? " · note thawed" : ""}`, a.now),
    loan: updated,
  };
}

export function extend(state: LedgerState, borrower: Address, loanId: string, now: number): LedgerState {
  const loan = getLoan(state, loanId);
  if (loan.borrower !== borrower) fail("Unauthorized", "Only the borrower can extend.");
  if (loan.state !== "Active") fail("AlreadyExtended", "A loan can be extended exactly once; after that it must be repaid or foreclosed.");
  if (isPastGrace(loan, now)) fail("PastGrace", "Grace period has elapsed; the loan is foreclosable and can no longer be extended.");
  const updated: Loan = { ...loan, extended: true, state: "Extended", expiresAt: loan.expiresAt + EXTENSION_SECONDS };
  return logTx({ ...state, loans: replace(state.loans, updated) }, "extend", borrower, `${loan.id} +30d at ${(loan.apyBps + EXTENSION_PENALTY_BPS) / 100}% APY`, now);
}

export function foreclose(state: LedgerState, lender: Address, loanId: string, now: number): LedgerState {
  const loan = getLoan(state, loanId);
  if (loan.lender !== lender) fail("Unauthorized", "Only the lender can foreclose.");
  if (loan.state !== "Active" && loan.state !== "Extended") fail("LoanClosed", `Loan ${loan.id} is ${loan.state}.`);
  if (!isPastGrace(loan, now)) {
    const hrs = Math.ceil((loan.expiresAt + GRACE_SECONDS - now) / 3600);
    fail("NotForeclosable", `Foreclose unlocks ${hrs}h from now (expiry + 72h grace).`);
  }
  const project = getProject(state, loan.projectId);
  // Whatever is in escrow goes to the lender along with the Project Note (claim on rebate + first REC invoice).
  let s = credit(state, lender, loan.escrowBalance);
  const updated: Loan = { ...loan, state: "Foreclosed", escrowBalance: 0, closedAt: now };
  s = {
    ...s,
    loans: replace(s.loans, updated),
    projects: replace(s.projects, { ...project, noteOwner: lender, noteFrozen: false, activeLoanId: null }),
  };
  return logTx(s, "foreclose", lender, `${loan.id}: Project Note ${short(project.noteMint)} transferred to lender, ${fmt(loan.escrowBalance)} escrow swept`, now);
}

export function claimFees(state: LedgerState, admin: Address, now: number): LedgerState {
  if (admin !== state.config.admin) fail("Unauthorized", "Only admin can claim fees.");
  const amt = state.config.treasuryBalance;
  let s = credit(state, state.config.treasury, amt);
  s = { ...s, config: { ...s.config, treasuryBalance: 0 } };
  return logTx(s, "claim_fees", admin, `${fmt(amt)} USDC → treasury`, now);
}

/** Mark expired loans Defaulted (view-time derivation the program does lazily). */
export function effectiveState(loan: Loan, now: number): Loan["state"] {
  if ((loan.state === "Active" || loan.state === "Extended") && isExpired(loan, now)) return "Defaulted";
  return loan.state;
}
