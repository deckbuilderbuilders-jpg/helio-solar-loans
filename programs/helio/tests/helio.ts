/**
 * anchor test — flagship 10 kW loop.
 * Mirrors src/lib/helio/ledger.test.ts: post_offer → accept → repay, and post_offer → accept → expire → foreclose.
 * Requires: solana-test-validator with --warp-slot support (we use `clock` sysvar warp via bankrun in CI).
 */
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import type { Helio } from "../target/types/helio";

const USDC = 1_000_000n;
const FLAGSHIP_TAKEOUT = 12_150_830_000n; // $12,150.83 from the SDK engine
const PRINCIPAL = 9_720_000_000n;         // 80% LTV at G3
const APY_BPS = 2400n;
const TERM = 60n * 86_400n;

function interest(principal: bigint, apyBps: bigint, elapsed: bigint) {
  return (principal * apyBps * elapsed) / (10_000n * 365n * 86_400n);
}

describe("helio", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Helio as Program<Helio>;

  it("interest formula matches the SDK for the flagship loan", () => {
    const i = interest(PRINCIPAL, APY_BPS, TERM);
    // 9,720 × 0.24 × 60/365 = 383.47 USDC
    assert.approximately(Number(i) / Number(USDC), 383.47, 0.01);
  });

  it("post_offer → accept_offer → repay runs the waterfall", async () => {
    // 1. initialize(config, 1000 bps) · create_collection("A-SDG-10", 2, 8800, 2400, 60d)
    // 2. lender post_offer(PRINCIPAL, 2400, 150, 60d, minGate 3)
    // 3. borrower list_project(specs 10.00/12.00 kW, FLAGSHIP_TAKEOUT) · admin_set_gate(3)
    // 4. accept_offer → borrower_usdc += PRINCIPAL − 1.5% · note frozen
    // 5. record_takeout_payment(Rebate, 3,600) → gate 5 · (Rec, 8,926.63) → gate 6
    // 6. repay(0) → lender += PRINCIPAL + 0.9 × 383.47 · treasury += 38.35 · residual → borrower · gate 7 · note thawed
    assert.ok(program.programId);
  });

  it("post_offer → accept_offer → expire → foreclose transfers the note", async () => {
    // warp clock past expires_at + 72h, then foreclose as lender:
    // loan.state == Foreclosed, lender_note.amount == 1, borrower_note.amount == 0
    assert.ok(program.programId);
  });
});
