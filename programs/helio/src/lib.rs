//! HELIO — Sharky-style fixed-term USDC loans against contracted Illinois solar takeouts.
//!
//! Collateral is a Project Note (Token-2022 mint with the program PDA as freeze authority).
//! The note never leaves the borrower's wallet while the loan is live: it is frozen in place
//! (Sharky's escrow-less freeze). On repay it is thawed; on default + 72h grace the lender
//! forecloses and the note — i.e. the claim on the Ameren rebate + first Illinois Shines REC
//! invoice — is transferred to the lender. There are NO mid-loan price liquidations.
//!
//! The TypeScript ledger in `src/lib/helio/ledger.ts` mirrors every instruction here 1:1.

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    self, freeze_account, thaw_account, transfer_checked, FreezeAccount, Mint, ThawAccount,
    TokenAccount, TokenInterface, TransferChecked,
};

declare_id!("HeLio1111111111111111111111111111111111111");

/// Grace after loan expiry before `foreclose` is allowed (72 hours).
pub const GRACE_SECONDS: i64 = 72 * 3600;
/// One 30-day extension, +6% APY penalty, then the loan must be repaid or foreclosed.
pub const EXTENSION_SECONDS: i64 = 30 * 86_400;
pub const EXTENSION_PENALTY_BPS: u64 = 600;
pub const SECONDS_PER_YEAR: u128 = 365 * 86_400;
/// Loans may only originate at G2 (ICC Trade Date), G3 (PTO + rebate filed) or G4 (Part II).
pub const MIN_ORIGINATION_GATE: u8 = 2;
pub const MAX_ORIGINATION_GATE: u8 = 4;

/// Interest = principal × apy_bps × elapsed / (10_000 × 365 × 86400), in micro-USDC.
pub fn interest(principal: u64, apy_bps: u64, elapsed: i64) -> Result<u64> {
    let n = (principal as u128)
        .checked_mul(apy_bps as u128)
        .and_then(|x| x.checked_mul(elapsed.max(0) as u128))
        .ok_or(HelioError::MathOverflow)?;
    Ok((n / (10_000u128 * SECONDS_PER_YEAR)) as u64)
}

#[program]
pub mod helio {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, protocol_fee_bps: u16) -> Result<()> {
        // Protocol takes 10% of interest (1000 bps) by default.
        require!(protocol_fee_bps <= 2_000, HelioError::FeeTooHigh);
        let cfg = &mut ctx.accounts.config;
        cfg.admin = ctx.accounts.admin.key();
        cfg.usdc_mint = ctx.accounts.usdc_mint.key();
        cfg.treasury = ctx.accounts.treasury.key();
        cfg.protocol_fee_bps = protocol_fee_bps;
        cfg.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn create_collection(
        ctx: Context<CreateCollection>,
        slug: String,
        gate_min: u8,
        ltv_bps: u16,
        default_apy_bps: u16,
        term_seconds: i64,
    ) -> Result<()> {
        require!(slug.len() <= 16, HelioError::SlugTooLong);
        // Illinois rule: nothing is contractually owed before the ICC Trade Date (G2).
        require!(gate_min >= MIN_ORIGINATION_GATE && gate_min <= MAX_ORIGINATION_GATE, HelioError::GateNotOriginatable);
        require!(ltv_bps <= 9_000, HelioError::LtvTooHigh);
        let c = &mut ctx.accounts.collection;
        c.slug = slug;
        c.gate_min = gate_min;
        c.ltv_bps = ltv_bps;
        c.default_apy_bps = default_apy_bps;
        c.term_seconds = term_seconds;
        c.bump = ctx.bumps.collection;
        Ok(())
    }

    /// Lender deposits USDC into the offer vault.
    pub fn post_offer(
        ctx: Context<PostOffer>,
        principal: u64,
        apy_bps: u16,
        origination_bps: u16,
        term_seconds: i64,
        min_gate: u8,
        offer_ttl: i64,
    ) -> Result<()> {
        require!(principal >= 100_000_000, HelioError::OfferTooSmall); // 100 USDC
        require!(apy_bps >= 100 && apy_bps <= 10_000, HelioError::BadApy);
        require!(min_gate >= ctx.accounts.collection.gate_min, HelioError::GateBelowCollection);
        require!(min_gate <= MAX_ORIGINATION_GATE, HelioError::GateNotOriginatable);
        let now = Clock::get()?.unix_timestamp;
        let o = &mut ctx.accounts.offer;
        o.lender = ctx.accounts.lender.key();
        o.collection = ctx.accounts.collection.key();
        o.principal = principal;
        o.apy_bps = apy_bps;
        o.origination_bps = origination_bps;
        o.term_seconds = term_seconds;
        o.min_gate = min_gate;
        o.expires_at = now + offer_ttl;
        o.state = OfferState::Open;
        o.bump = ctx.bumps.offer;
        token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.lender_usdc.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    to: ctx.accounts.offer_vault.to_account_info(),
                    authority: ctx.accounts.lender.to_account_info(),
                },
            ),
            principal,
            ctx.accounts.usdc_mint.decimals,
        )
    }

    pub fn cancel_offer(ctx: Context<CancelOffer>) -> Result<()> {
        let o = &mut ctx.accounts.offer;
        require!(o.state == OfferState::Open, HelioError::OfferNotOpen);
        o.state = OfferState::Cancelled;
        let seeds: &[&[u8]] = &[b"offer", o.lender.as_ref(), &o.nonce.to_le_bytes(), &[o.bump]];
        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.offer_vault.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    to: ctx.accounts.lender_usdc.to_account_info(),
                    authority: ctx.accounts.offer.to_account_info(),
                },
                &[seeds],
            ),
            o.principal,
            ctx.accounts.usdc_mint.decimals,
        )
    }

    /// Borrower registers a project and its Project Note. Takeout is computed off-chain by the SDK
    /// (identical formula) and cached here; the milestone oracle can re-set it.
    pub fn list_project(ctx: Context<ListProject>, specs: ProjectSpecs, takeout_usdc: u64) -> Result<()> {
        let p = &mut ctx.accounts.project;
        p.borrower = ctx.accounts.borrower.key();
        p.collection = ctx.accounts.collection.key();
        p.note_mint = ctx.accounts.note_mint.key();
        p.specs = specs;
        p.takeout_usdc = takeout_usdc;
        p.gate = 0;
        p.active_loan = Pubkey::default();
        p.bump = ctx.bumps.project;
        Ok(())
    }

    /// Demo milestone oracle: admin advances G0–G6. G7 is set by `repay`.
    pub fn admin_set_gate(ctx: Context<AdminSetGate>, gate: u8) -> Result<()> {
        require!(gate <= 6, HelioError::GateReserved);
        ctx.accounts.project.gate = gate;
        Ok(())
    }

    /// Checks collection, gate ≥ offer min, principal ≤ takeout × LTV; freezes the note; pays borrower.
    pub fn accept_offer(ctx: Context<AcceptOffer>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let offer = &mut ctx.accounts.offer;
        let project = &mut ctx.accounts.project;
        let col = &ctx.accounts.collection;
        require!(offer.state == OfferState::Open, HelioError::OfferNotOpen);
        require!(offer.expires_at >= now, HelioError::OfferExpired);
        require!(project.collection == offer.collection, HelioError::CollectionMismatch);
        require!(project.gate >= offer.min_gate, HelioError::GateTooLow);
        require!(project.active_loan == Pubkey::default(), HelioError::NoteFrozen);
        // LTV cap by gate: G2 70% · G3 80% · G4 88%, never above the collection cap.
        let gate_ltv: u64 = match project.gate { 2 => 7_000, 3 => 8_000, _ => 8_800 };
        let ltv = gate_ltv.min(col.ltv_bps as u64);
        let lendable = (project.takeout_usdc as u128 * ltv as u128 / 10_000) as u64;
        require!(offer.principal <= lendable, HelioError::ExceedsLtv);

        let origination = (offer.principal as u128 * offer.origination_bps as u128 / 10_000) as u64;
        let loan = &mut ctx.accounts.loan;
        loan.offer = offer.key();
        loan.project = project.key();
        loan.lender = offer.lender;
        loan.borrower = project.borrower;
        loan.principal = offer.principal;
        loan.apy_bps = offer.apy_bps;
        loan.start_at = now;
        loan.term_seconds = offer.term_seconds;
        loan.expires_at = now + offer.term_seconds;
        loan.extended = false;
        loan.state = LoanState::Active;
        loan.bump = ctx.bumps.loan;
        offer.state = OfferState::Taken;
        project.active_loan = loan.key();

        // Freeze the Project Note in the borrower's wallet (program PDA is the mint freeze authority).
        let cfg_seeds: &[&[u8]] = &[b"config", &[ctx.accounts.config.bump]];
        freeze_account(CpiContext::new_with_signer(
            ctx.accounts.note_token_program.to_account_info(),
            FreezeAccount {
                account: ctx.accounts.borrower_note.to_account_info(),
                mint: ctx.accounts.note_mint.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            &[cfg_seeds],
        ))?;

        // Offer vault → borrower (net of origination) and → treasury (origination).
        let offer_seeds: &[&[u8]] = &[b"offer", offer.lender.as_ref(), &offer.nonce.to_le_bytes(), &[offer.bump]];
        let dec = ctx.accounts.usdc_mint.decimals;
        let pay = |to: AccountInfo, amount: u64| -> Result<()> {
            transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.offer_vault.to_account_info(),
                        mint: ctx.accounts.usdc_mint.to_account_info(),
                        to,
                        authority: ctx.accounts.offer.to_account_info(),
                    },
                    &[offer_seeds],
                ),
                amount,
                dec,
            )
        };
        pay(ctx.accounts.borrower_usdc.to_account_info(), offer.principal - origination)?;
        pay(ctx.accounts.treasury_usdc.to_account_info(), origination)
    }

    /// Anyone (in the demo: the oracle) posts USDC into the loan escrow tagged rebate|rec.
    pub fn record_takeout_payment(ctx: Context<RecordTakeoutPayment>, kind: PaymentKind, amount: u64) -> Result<()> {
        let loan = &ctx.accounts.loan;
        require!(matches!(loan.state, LoanState::Active | LoanState::Extended), HelioError::LoanClosed);
        let p = &mut ctx.accounts.project;
        // Ameren rebate landing ⇒ G5; first REC invoice landing ⇒ G6.
        let implied = match kind { PaymentKind::Rebate => 5, PaymentKind::Rec => 6 };
        if p.gate < implied { p.gate = implied; }
        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.payer_usdc.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    to: ctx.accounts.loan_escrow.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            amount,
            ctx.accounts.usdc_mint.decimals,
        )
    }

    /// Waterfall: escrow (+ optional wallet top-up) → principal → interest net of protocol cut → residual to borrower.
    pub fn repay(ctx: Context<Repay>, wallet_amount: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let loan = &mut ctx.accounts.loan;
        require!(matches!(loan.state, LoanState::Active | LoanState::Extended), HelioError::LoanClosed);
        let dec = ctx.accounts.usdc_mint.decimals;

        if wallet_amount > 0 {
            require_keys_eq!(ctx.accounts.signer.key(), loan.borrower, HelioError::Unauthorized);
            transfer_checked(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.signer_usdc.to_account_info(),
                        mint: ctx.accounts.usdc_mint.to_account_info(),
                        to: ctx.accounts.loan_escrow.to_account_info(),
                        authority: ctx.accounts.signer.to_account_info(),
                    },
                ),
                wallet_amount,
                dec,
            )?;
            ctx.accounts.loan_escrow.reload()?;
        }
        let mut available = ctx.accounts.loan_escrow.amount;
        require!(available > 0, HelioError::NothingToRepay);

        // Fixed-term: full term interest is due regardless of early repay (Sharky semantics).
        let mut due = interest(loan.principal, loan.apy_bps as u64, loan.term_seconds)?;
        if loan.extended {
            due += interest(loan.principal, loan.apy_bps as u64 + EXTENSION_PENALTY_BPS, EXTENSION_SECONDS)?;
        }
        let p = available.min(loan.principal - loan.principal_repaid);
        available -= p;
        let interest_gap = due - loan.interest_paid - loan.protocol_cut_paid;
        let i = available.min(interest_gap);
        available -= i;
        let cut = (i as u128 * ctx.accounts.config.protocol_fee_bps as u128 / 10_000) as u64;
        let residual = available;

        loan.principal_repaid += p;
        loan.interest_paid += i - cut;
        loan.protocol_cut_paid += cut;
        loan.residual_to_borrower += residual;

        let loan_key = loan.key();
        let seeds: &[&[u8]] = &[b"escrow", loan_key.as_ref(), &[ctx.bumps.loan_escrow]];
        let mut send = |to: AccountInfo, amount: u64| -> Result<()> {
            if amount == 0 { return Ok(()); }
            transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.loan_escrow.to_account_info(),
                        mint: ctx.accounts.usdc_mint.to_account_info(),
                        to,
                        authority: ctx.accounts.loan_escrow.to_account_info(),
                    },
                    &[seeds],
                ),
                amount,
                dec,
            )
        };
        send(ctx.accounts.lender_usdc.to_account_info(), p + i - cut)?;
        send(ctx.accounts.treasury_usdc.to_account_info(), cut)?;
        send(ctx.accounts.borrower_usdc.to_account_info(), residual)?;

        if loan.principal_repaid >= loan.principal && loan.interest_paid + loan.protocol_cut_paid >= due {
            loan.state = LoanState::Repaid;
            loan.closed_at = now;
            let project = &mut ctx.accounts.project;
            project.gate = 7;
            project.active_loan = Pubkey::default();
            let cfg_seeds: &[&[u8]] = &[b"config", &[ctx.accounts.config.bump]];
            thaw_account(CpiContext::new_with_signer(
                ctx.accounts.note_token_program.to_account_info(),
                ThawAccount {
                    account: ctx.accounts.borrower_note.to_account_info(),
                    mint: ctx.accounts.note_mint.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                &[cfg_seeds],
            ))?;
        }
        Ok(())
    }

    /// One 30-day extension at +6% APY. Not allowed once grace has elapsed.
    pub fn extend(ctx: Context<Extend>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let loan = &mut ctx.accounts.loan;
        require!(loan.state == LoanState::Active, HelioError::AlreadyExtended);
        require!(now <= loan.expires_at + GRACE_SECONDS, HelioError::PastGrace);
        loan.extended = true;
        loan.state = LoanState::Extended;
        loan.expires_at += EXTENSION_SECONDS;
        Ok(())
    }

    /// After expiry + 72h grace the lender takes the note (claim on rebate + first REC invoice) and any escrow.
    pub fn foreclose(ctx: Context<Foreclose>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let loan = &mut ctx.accounts.loan;
        require!(matches!(loan.state, LoanState::Active | LoanState::Extended), HelioError::LoanClosed);
        require!(now > loan.expires_at + GRACE_SECONDS, HelioError::NotForeclosable);
        loan.state = LoanState::Foreclosed;
        loan.closed_at = now;
        let project = &mut ctx.accounts.project;
        project.active_loan = Pubkey::default();

        let cfg_seeds: &[&[u8]] = &[b"config", &[ctx.accounts.config.bump]];
        // Thaw, then move the note borrower → lender using the config PDA as Token-2022 permanent delegate.
        thaw_account(CpiContext::new_with_signer(
            ctx.accounts.note_token_program.to_account_info(),
            ThawAccount {
                account: ctx.accounts.borrower_note.to_account_info(),
                mint: ctx.accounts.note_mint.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            &[cfg_seeds],
        ))?;
        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.note_token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.borrower_note.to_account_info(),
                    mint: ctx.accounts.note_mint.to_account_info(),
                    to: ctx.accounts.lender_note.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                &[cfg_seeds],
            ),
            1,
            0,
        )?;
        let escrow = ctx.accounts.loan_escrow.amount;
        if escrow > 0 {
            let loan_key = loan.key();
            let seeds: &[&[u8]] = &[b"escrow", loan_key.as_ref(), &[ctx.bumps.loan_escrow]];
            transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.loan_escrow.to_account_info(),
                        mint: ctx.accounts.usdc_mint.to_account_info(),
                        to: ctx.accounts.lender_usdc.to_account_info(),
                        authority: ctx.accounts.loan_escrow.to_account_info(),
                    },
                    &[seeds],
                ),
                escrow,
                ctx.accounts.usdc_mint.decimals,
            )?;
        }
        Ok(())
    }
}

// ───────────────────────── state ─────────────────────────

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub usdc_mint: Pubkey,
    pub treasury: Pubkey,
    pub protocol_fee_bps: u16,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Collection {
    #[max_len(16)]
    pub slug: String,
    pub gate_min: u8,
    pub ltv_bps: u16,
    pub default_apy_bps: u16,
    pub term_seconds: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum OfferState { Open, Taken, Cancelled }

#[account]
#[derive(InitSpace)]
pub struct Offer {
    pub lender: Pubkey,
    pub collection: Pubkey,
    pub nonce: u64,
    pub principal: u64,
    pub apy_bps: u16,
    pub origination_bps: u16,
    pub term_seconds: i64,
    pub min_gate: u8,
    pub expires_at: i64,
    pub state: OfferState,
    pub bump: u8,
}

/// kW in hundredths (10.00 kW = 1000), kWh in tenths.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, Default)]
pub struct ProjectSpecs {
    pub kw_ac_x100: u32,
    pub kw_dc_x100: u32,
    pub battery_kwh_x10: u32,
    pub customer_owned: bool,
    pub eec: bool,
}

#[account]
#[derive(InitSpace)]
pub struct Project {
    pub borrower: Pubkey,
    pub collection: Pubkey,
    pub note_mint: Pubkey,
    pub specs: ProjectSpecs,
    pub takeout_usdc: u64,
    pub gate: u8,
    pub active_loan: Pubkey,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum LoanState { Active, Extended, Repaid, Defaulted, Foreclosed }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PaymentKind { Rebate, Rec }

#[account]
#[derive(InitSpace)]
pub struct Loan {
    pub offer: Pubkey,
    pub project: Pubkey,
    pub lender: Pubkey,
    pub borrower: Pubkey,
    pub principal: u64,
    pub apy_bps: u16,
    pub start_at: i64,
    pub term_seconds: i64,
    pub expires_at: i64,
    pub extended: bool,
    pub state: LoanState,
    pub principal_repaid: u64,
    pub interest_paid: u64,
    pub protocol_cut_paid: u64,
    pub residual_to_borrower: u64,
    pub closed_at: i64,
    pub bump: u8,
}

// ───────────────────────── accounts ─────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin, space = 8 + Config::INIT_SPACE, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    /// CHECK: treasury wallet, any key
    pub treasury: UncheckedAccount<'info>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(slug: String)]
pub struct CreateCollection<'info> {
    #[account(has_one = admin)]
    pub config: Account<'info, Config>,
    #[account(init, payer = admin, space = 8 + Collection::INIT_SPACE, seeds = [b"collection", slug.as_bytes()], bump)]
    pub collection: Account<'info, Collection>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(principal: u64, apy_bps: u16, origination_bps: u16, term_seconds: i64, min_gate: u8, offer_ttl: i64, nonce: u64)]
pub struct PostOffer<'info> {
    pub config: Account<'info, Config>,
    pub collection: Account<'info, Collection>,
    #[account(init, payer = lender, space = 8 + Offer::INIT_SPACE, seeds = [b"offer", lender.key().as_ref(), &nonce.to_le_bytes()], bump)]
    pub offer: Account<'info, Offer>,
    #[account(init, payer = lender, token::mint = usdc_mint, token::authority = offer, seeds = [b"offer_vault", offer.key().as_ref()], bump)]
    pub offer_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint = usdc_mint, token::authority = lender)]
    pub lender_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub lender: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelOffer<'info> {
    #[account(mut, has_one = lender)]
    pub offer: Account<'info, Offer>,
    #[account(mut, seeds = [b"offer_vault", offer.key().as_ref()], bump)]
    pub offer_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub lender_usdc: InterfaceAccount<'info, TokenAccount>,
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    pub lender: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ListProject<'info> {
    pub collection: Account<'info, Collection>,
    #[account(init, payer = borrower, space = 8 + Project::INIT_SPACE, seeds = [b"project", note_mint.key().as_ref()], bump)]
    pub project: Account<'info, Project>,
    /// Token-2022 mint, supply 1, freeze authority + permanent delegate = config PDA.
    pub note_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub borrower: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminSetGate<'info> {
    #[account(has_one = admin)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub project: Account<'info, Project>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct AcceptOffer<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub collection: Account<'info, Collection>,
    #[account(mut)]
    pub offer: Account<'info, Offer>,
    #[account(mut, has_one = borrower)]
    pub project: Account<'info, Project>,
    #[account(init, payer = borrower, space = 8 + Loan::INIT_SPACE, seeds = [b"loan", offer.key().as_ref(), project.key().as_ref()], bump)]
    pub loan: Account<'info, Loan>,
    #[account(init, payer = borrower, token::mint = usdc_mint, token::authority = loan_escrow, seeds = [b"escrow", loan.key().as_ref()], bump)]
    pub loan_escrow: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, seeds = [b"offer_vault", offer.key().as_ref()], bump)]
    pub offer_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub borrower_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub treasury_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(address = project.note_mint)]
    pub note_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, token::mint = note_mint, token::authority = borrower, constraint = borrower_note.amount == 1 @ HelioError::NoteMissing)]
    pub borrower_note: InterfaceAccount<'info, TokenAccount>,
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub borrower: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub note_token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordTakeoutPayment<'info> {
    #[account(has_one = project)]
    pub loan: Account<'info, Loan>,
    #[account(mut)]
    pub project: Account<'info, Project>,
    #[account(mut, seeds = [b"escrow", loan.key().as_ref()], bump)]
    pub loan_escrow: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub payer_usdc: InterfaceAccount<'info, TokenAccount>,
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    pub payer: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Repay<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, has_one = project)]
    pub loan: Account<'info, Loan>,
    #[account(mut)]
    pub project: Account<'info, Project>,
    #[account(mut, seeds = [b"escrow", loan.key().as_ref()], bump)]
    pub loan_escrow: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub signer_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::authority = loan.lender)]
    pub lender_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::authority = loan.borrower)]
    pub borrower_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::authority = config.treasury)]
    pub treasury_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(address = project.note_mint)]
    pub note_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub borrower_note: InterfaceAccount<'info, TokenAccount>,
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    pub signer: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub note_token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Extend<'info> {
    #[account(mut, has_one = borrower)]
    pub loan: Account<'info, Loan>,
    pub borrower: Signer<'info>,
}

#[derive(Accounts)]
pub struct Foreclose<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, has_one = lender, has_one = project)]
    pub loan: Account<'info, Loan>,
    #[account(mut)]
    pub project: Account<'info, Project>,
    #[account(mut, seeds = [b"escrow", loan.key().as_ref()], bump)]
    pub loan_escrow: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub lender_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(address = project.note_mint)]
    pub note_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub borrower_note: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint = note_mint, token::authority = lender)]
    pub lender_note: InterfaceAccount<'info, TokenAccount>,
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    pub lender: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub note_token_program: Interface<'info, TokenInterface>,
}

#[error_code]
pub enum HelioError {
    #[msg("Protocol fee above 20%")] FeeTooHigh,
    #[msg("Collection slug longer than 16 bytes")] SlugTooLong,
    #[msg("Loans may only originate at G2, G3 or G4 (Illinois Shines Trade Date or later)")] GateNotOriginatable,
    #[msg("LTV above 90%")] LtvTooHigh,
    #[msg("Minimum offer is 100 USDC")] OfferTooSmall,
    #[msg("APY must be 1%–100%")] BadApy,
    #[msg("Offer minimum gate is below the collection minimum")] GateBelowCollection,
    #[msg("Offer is not open")] OfferNotOpen,
    #[msg("Offer expired")] OfferExpired,
    #[msg("Project collection does not match offer collection")] CollectionMismatch,
    #[msg("Project milestone below the offer's minimum gate")] GateTooLow,
    #[msg("Project Note is already frozen by a live loan")] NoteFrozen,
    #[msg("Borrower does not hold the Project Note")] NoteMissing,
    #[msg("Principal exceeds takeout × LTV")] ExceedsLtv,
    #[msg("G7 is set by repay, not the oracle")] GateReserved,
    #[msg("Loan is not active")] LoanClosed,
    #[msg("Nothing to repay")] NothingToRepay,
    #[msg("Only the borrower may top up from wallet")] Unauthorized,
    #[msg("Loan already extended once")] AlreadyExtended,
    #[msg("Grace period elapsed; loan is foreclosable")] PastGrace,
    #[msg("Loan is not yet past expiry + 72h grace")] NotForeclosable,
    #[msg("Math overflow")] MathOverflow,
}
