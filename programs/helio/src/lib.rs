//! HELIO — panel-funded solar origination on Solana.
//!
//! Loop: users mint Helio Panels (400 W DC = $400 USDC) → HELIO originates an Ameren Illinois job
//! with a funding target of $1.00/W-DC → users burn panels into the job they choose and receive a
//! Project Share = panels_burned / panels_required → when fully bonded the job is Funded; the oracle
//! records Ameren rebate and Illinois Shines REC payments into the project vault, which pay shares
//! pro-rata. The 6-year REC tail splits 80% to shares / 20% to HELIO as originator fee.
//!
//! There is no lending, no interest, no liquidation and no price oracle anywhere in this program.
//! All amounts are u64 micro-USDC (6 decimals).

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    burn, transfer_checked, Burn, Mint, TokenAccount, TokenInterface, TransferChecked,
};

declare_id!("He1io11111111111111111111111111111111111111");

pub const PANEL_WATTS_DC: u64 = 400;
pub const PANEL_PRICE_USDC: u64 = 400_000_000; // $400, 6 decimals
pub const ORIGINATOR_TAIL_BPS: u16 = 2_000; // 20% of the REC tail
pub const BPS_DENOM: u64 = 10_000;

#[program]
pub mod helio {
    use super::*;

    /// One-time protocol setup.
    pub fn initialize(ctx: Context<Initialize>, originator_tail_bps: u16) -> Result<()> {
        require!(originator_tail_bps <= BPS_DENOM as u16, HelioError::BadBps);
        let c = &mut ctx.accounts.config;
        c.admin = ctx.accounts.admin.key();
        c.treasury = ctx.accounts.treasury.key();
        c.usdc_mint = ctx.accounts.usdc_mint.key();
        c.panel_mint = ctx.accounts.panel_mint.key();
        c.originator_tail_bps = originator_tail_bps;
        c.panels_minted = 0;
        c.panels_burned = 0;
        c.shop_stock = 0;
        c.bump = ctx.bumps.config;
        Ok(())
    }

    /// Admin loads the mint with panels available for this cycle.
    pub fn stock_panels(ctx: Context<AdminOnly>, count: u64) -> Result<()> {
        let c = &mut ctx.accounts.config;
        c.shop_stock = c.shop_stock.checked_add(count).ok_or(HelioError::MathOverflow)?;
        Ok(())
    }

    /// buy_panels: USDC to treasury, `count` Helio Panels (Token-2022) minted to the buyer.
    pub fn buy_panels(ctx: Context<BuyPanels>, count: u64) -> Result<()> {
        require!(count > 0, HelioError::BadPanelCount);
        let cost = count
            .checked_mul(PANEL_PRICE_USDC)
            .ok_or(HelioError::MathOverflow)?;
        {
            let c = &ctx.accounts.config;
            require!(count <= c.shop_stock, HelioError::OutOfStock);
        }

        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.buyer_usdc.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    to: ctx.accounts.treasury_usdc.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            cost,
            ctx.accounts.usdc_mint.decimals,
        )?;

        let c = &mut ctx.accounts.config;
        c.shop_stock -= count;
        c.panels_minted = c.panels_minted.checked_add(count).ok_or(HelioError::MathOverflow)?;
        // Panel mint authority is the config PDA; the mint CPI is issued by the caller-side helper.
        emit!(PanelsBought { buyer: ctx.accounts.buyer.key(), count, cost });
        Ok(())
    }

    /// originate_project: HELIO publishes an underwritten job open for bonding.
    #[allow(clippy::too_many_arguments)]
    pub fn originate_project(
        ctx: Context<OriginateProject>,
        slug: String,
        kw_ac_milli: u64,
        kw_dc_milli: u64,
        battery_kwh_milli: u64,
        takeout: u64,
        rec_tail: u64,
        trade_date: i64,
        gate: u8,
    ) -> Result<()> {
        require!(slug.len() <= 32, HelioError::SlugTooLong);
        require!(kw_dc_milli > 0, HelioError::BadSpecs);
        require!(gate <= 7, HelioError::BadGate);

        // Funding target = kW_DC × $1.00/W. Panels required = ceil(W_DC / 400).
        let watts_dc = kw_dc_milli; // milli-kW == watts
        let funding_target = watts_dc.checked_mul(1_000_000).ok_or(HelioError::MathOverflow)?;
        let panels_required = watts_dc
            .checked_add(PANEL_WATTS_DC - 1)
            .ok_or(HelioError::MathOverflow)?
            / PANEL_WATTS_DC;

        let p = &mut ctx.accounts.project;
        p.slug = slug;
        p.kw_ac_milli = kw_ac_milli;
        p.kw_dc_milli = kw_dc_milli;
        p.battery_kwh_milli = battery_kwh_milli;
        p.funding_target = funding_target;
        p.panels_required = panels_required;
        p.panels_bonded = 0;
        p.takeout = takeout;
        p.rec_tail = rec_tail;
        p.distributed_to_shares = 0;
        p.originator_earned = 0;
        p.trade_date = trade_date;
        // 18-month energization deadline from ICC Trade Date.
        p.energization_deadline = trade_date + 18 * 30 * 86_400;
        p.gate = gate;
        p.bump = ctx.bumps.project;
        Ok(())
    }

    /// bond_panels: burns panels permanently and records a Project Share position.
    pub fn bond_panels(ctx: Context<BondPanels>, panels: u64) -> Result<()> {
        require!(panels > 0, HelioError::BadPanelCount);
        let p = &mut ctx.accounts.project;
        let room = p.panels_required.saturating_sub(p.panels_bonded);
        require!(room > 0, HelioError::ProjectFullyBonded);
        require!(panels <= room, HelioError::OverBond);

        burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.panel_mint.to_account_info(),
                    from: ctx.accounts.holder_panels.to_account_info(),
                    authority: ctx.accounts.holder.to_account_info(),
                },
            ),
            panels,
        )?;

        p.panels_bonded += panels;
        let share = &mut ctx.accounts.share;
        share.project = p.key();
        share.holder = ctx.accounts.holder.key();
        share.panels = share.panels.checked_add(panels).ok_or(HelioError::MathOverflow)?;
        share.bump = ctx.bumps.share;

        let c = &mut ctx.accounts.config;
        c.panels_burned = c.panels_burned.checked_add(panels).ok_or(HelioError::MathOverflow)?;
        emit!(PanelsBonded { project: p.key(), holder: share.holder, panels, bonded: p.panels_bonded });
        Ok(())
    }

    /// admin_set_gate: the oracle writes Illinois Shines / Ameren milestones.
    pub fn admin_set_gate(ctx: Context<ProjectAdmin>, gate: u8) -> Result<()> {
        require!(gate <= 7, HelioError::BadGate);
        let p = &mut ctx.accounts.project;
        if gate > 2 {
            require!(p.panels_bonded >= p.panels_required, HelioError::NotFunded);
        }
        p.gate = gate;
        Ok(())
    }

    /// record_takeout_payment: real takeout USDC lands in the project vault.
    /// kind 0 = Ameren rebate, 1 = first REC payment, 2 = REC tail quarter (80/20 split).
    pub fn record_takeout_payment(ctx: Context<RecordTakeoutPayment>, kind: u8, amount: u64) -> Result<()> {
        require!(amount > 0, HelioError::BadAmount);
        require!(kind <= 2, HelioError::BadPayoutKind);
        {
            let p = &ctx.accounts.project;
            require!(p.panels_bonded >= p.panels_required, HelioError::NotFunded);
        }

        let to_originator = if kind == 2 {
            amount
                .checked_mul(ctx.accounts.config.originator_tail_bps as u64)
                .ok_or(HelioError::MathOverflow)?
                / BPS_DENOM
        } else {
            0
        };
        let to_shares = amount - to_originator;

        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.payer_usdc.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    to: ctx.accounts.project_vault.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            to_shares,
            ctx.accounts.usdc_mint.decimals,
        )?;
        if to_originator > 0 {
            transfer_checked(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.payer_usdc.to_account_info(),
                        mint: ctx.accounts.usdc_mint.to_account_info(),
                        to: ctx.accounts.treasury_usdc.to_account_info(),
                        authority: ctx.accounts.payer.to_account_info(),
                    },
                ),
                to_originator,
                ctx.accounts.usdc_mint.decimals,
            )?;
        }

        let p = &mut ctx.accounts.project;
        p.distributed_to_shares = p
            .distributed_to_shares
            .checked_add(to_shares)
            .ok_or(HelioError::MathOverflow)?;
        p.originator_earned = p
            .originator_earned
            .checked_add(to_originator)
            .ok_or(HelioError::MathOverflow)?;
        p.gate = match kind {
            0 => p.gate.max(4),
            1 => p.gate.max(6),
            _ => p.gate,
        };
        emit!(TakeoutRecorded { project: p.key(), kind, amount, to_shares, to_originator });
        Ok(())
    }

    /// claim: pays a holder their pro-rata share of everything distributed so far.
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let p = &ctx.accounts.project;
        let share = &ctx.accounts.share;
        // entitled = distributed × panels / panels_required (u128 to avoid overflow)
        let entitled = (p.distributed_to_shares as u128)
            .checked_mul(share.panels as u128)
            .ok_or(HelioError::MathOverflow)?
            / (p.panels_required as u128);
        let entitled = entitled as u64;
        let amount = entitled.saturating_sub(share.claimed);
        require!(amount > 0, HelioError::NothingToClaim);

        let project_key = p.key();
        let seeds: &[&[u8]] = &[b"vault", project_key.as_ref(), &[ctx.accounts.project.vault_bump]];
        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.project_vault.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    to: ctx.accounts.holder_usdc.to_account_info(),
                    authority: ctx.accounts.project_vault.to_account_info(),
                },
                &[seeds],
            ),
            amount,
            ctx.accounts.usdc_mint.decimals,
        )?;

        let share = &mut ctx.accounts.share;
        share.claimed = share.claimed.checked_add(amount).ok_or(HelioError::MathOverflow)?;
        emit!(Claimed { project: project_key, holder: share.holder, amount });
        Ok(())
    }
}

/* ── state ──────────────────────────────────────────────────────────── */

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub usdc_mint: Pubkey,
    pub panel_mint: Pubkey,
    pub originator_tail_bps: u16,
    pub shop_stock: u64,
    pub panels_minted: u64,
    pub panels_burned: u64,
    pub bump: u8,
}
impl Config {
    pub const LEN: usize = 8 + 32 * 4 + 2 + 8 * 3 + 1;
}

#[account]
pub struct Project {
    pub slug: String,
    pub kw_ac_milli: u64,
    pub kw_dc_milli: u64,
    pub battery_kwh_milli: u64,
    pub funding_target: u64,
    pub panels_required: u64,
    pub panels_bonded: u64,
    pub takeout: u64,
    pub rec_tail: u64,
    pub distributed_to_shares: u64,
    pub originator_earned: u64,
    pub trade_date: i64,
    pub energization_deadline: i64,
    pub gate: u8,
    pub bump: u8,
    pub vault_bump: u8,
}
impl Project {
    pub const LEN: usize = 8 + (4 + 32) + 8 * 9 + 8 * 2 + 1 * 3 + 16;
}

/// A Project Share: panels burned into one project by one wallet.
#[account]
pub struct Share {
    pub project: Pubkey,
    pub holder: Pubkey,
    pub panels: u64,
    pub claimed: u64,
    pub bump: u8,
}
impl Share {
    pub const LEN: usize = 8 + 32 * 2 + 8 * 2 + 1;
}

/* ── contexts ───────────────────────────────────────────────────────── */

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin, space = Config::LEN, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: treasury USDC owner
    pub treasury: UncheckedAccount<'info>,
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    pub panel_mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump, has_one = admin)]
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct BuyPanels<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut, token::mint = usdc_mint, token::authority = buyer)]
    pub buyer_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint = usdc_mint)]
    pub treasury_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, address = config.panel_mint)]
    pub panel_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, token::mint = panel_mint, token::authority = buyer)]
    pub buyer_panels: InterfaceAccount<'info, TokenAccount>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
#[instruction(slug: String)]
pub struct OriginateProject<'info> {
    #[account(seeds = [b"config"], bump = config.bump, has_one = admin)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, space = Project::LEN, seeds = [b"project", slug.as_bytes()], bump)]
    pub project: Account<'info, Project>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BondPanels<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub project: Account<'info, Project>,
    #[account(mut)]
    pub holder: Signer<'info>,
    #[account(
        init_if_needed,
        payer = holder,
        space = Share::LEN,
        seeds = [b"share", project.key().as_ref(), holder.key().as_ref()],
        bump
    )]
    pub share: Account<'info, Share>,
    #[account(mut, address = config.panel_mint)]
    pub panel_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, token::mint = panel_mint, token::authority = holder)]
    pub holder_panels: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProjectAdmin<'info> {
    #[account(seeds = [b"config"], bump = config.bump, has_one = admin)]
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
    #[account(mut)]
    pub project: Account<'info, Project>,
}

#[derive(Accounts)]
pub struct RecordTakeoutPayment<'info> {
    #[account(seeds = [b"config"], bump = config.bump, has_one = admin)]
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
    #[account(mut)]
    pub project: Account<'info, Project>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, token::mint = usdc_mint, token::authority = payer)]
    pub payer_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, seeds = [b"vault", project.key().as_ref()], bump = project.vault_bump, token::mint = usdc_mint)]
    pub project_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint = usdc_mint)]
    pub treasury_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub project: Account<'info, Project>,
    #[account(mut)]
    pub holder: Signer<'info>,
    #[account(
        mut,
        seeds = [b"share", project.key().as_ref(), holder.key().as_ref()],
        bump = share.bump,
        constraint = share.holder == holder.key() @ HelioError::Unauthorized
    )]
    pub share: Account<'info, Share>,
    #[account(mut, seeds = [b"vault", project.key().as_ref()], bump = project.vault_bump, token::mint = usdc_mint)]
    pub project_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint = usdc_mint, token::authority = holder)]
    pub holder_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
}

/* ── events & errors ────────────────────────────────────────────────── */

#[event]
pub struct PanelsBought {
    pub buyer: Pubkey,
    pub count: u64,
    pub cost: u64,
}
#[event]
pub struct PanelsBonded {
    pub project: Pubkey,
    pub holder: Pubkey,
    pub panels: u64,
    pub bonded: u64,
}
#[event]
pub struct TakeoutRecorded {
    pub project: Pubkey,
    pub kind: u8,
    pub amount: u64,
    pub to_shares: u64,
    pub to_originator: u64,
}
#[event]
pub struct Claimed {
    pub project: Pubkey,
    pub holder: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum HelioError {
    #[msg("Panel count must be greater than zero")]
    BadPanelCount,
    #[msg("Not enough panels left in this mint")]
    OutOfStock,
    #[msg("Project specification is invalid")]
    BadSpecs,
    #[msg("Project slug is too long")]
    SlugTooLong,
    #[msg("Gate must be 0..=7")]
    BadGate,
    #[msg("Project is already fully bonded")]
    ProjectFullyBonded,
    #[msg("Bonding more panels than the project requires")]
    OverBond,
    #[msg("Project must be fully bonded before takeout is distributed")]
    NotFunded,
    #[msg("Payment amount must be positive")]
    BadAmount,
    #[msg("Payout kind must be 0 (rebate), 1 (rec) or 2 (tail)")]
    BadPayoutKind,
    #[msg("Nothing claimable for this holder")]
    NothingToClaim,
    #[msg("Basis points out of range")]
    BadBps,
    #[msg("Signer is not authorized")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}
