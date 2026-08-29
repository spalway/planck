use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Burn, Mint, TokenAccount, TokenInterface};

use crate::constants::*;
use crate::error::ApeError;
use crate::state::Config;

#[derive(Accounts)]
pub struct BurnApe<'info> {
    /// Permissionless: anyone may fire the crank. Whoever calls it pays the
    /// fee and gets nothing, which is fine — the point is that destroying
    /// supply needs nobody's permission.
    pub cranker: Signer<'info>,

    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        address = config.ape_mint @ ApeError::TokenNotLaunched
    )]
    pub ape_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: PDA that owns the vault; seeds are verified here.
    #[account(seeds = [VAULT_SEED], bump)]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        token::mint = ape_mint,
        token::authority = vault_authority
    )]
    pub burn_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

/// Destroy everything the vault holds.
///
/// The keeper does the SOL to $APE swap as an ordinary Jupiter
/// transaction and sends the proceeds here. That leg is operated. This one is
/// not: the burn is on chain, permissionless and public, and the running
/// total lives in Config where anyone can read it.
///
/// A Jupiter swap cannot be folded into this instruction — CPI is capped at
/// 64 account infos and a route routinely exceeds it (SIMD-0339 names Jupiter
/// as the case). Batching also makes the burn a visible event rather than
/// dust nobody notices.
pub fn handle_burn_ape(ctx: Context<BurnApe>) -> Result<()> {
    require!(
        ctx.accounts.config.ape_mint != Pubkey::default(),
        ApeError::TokenNotLaunched
    );

    let amount = ctx.accounts.burn_vault.amount;
    require!(amount > 0, ApeError::NothingToBurn);

    let bump = ctx.bumps.vault_authority;
    let seeds: &[&[u8]] = &[VAULT_SEED, &[bump]];
    let signer: &[&[&[u8]]] = &[seeds];

    token_interface::burn(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            Burn {
                mint: ctx.accounts.ape_mint.to_account_info(),
                from: ctx.accounts.burn_vault.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            signer,
        ),
        amount,
    )?;

    let config = &mut ctx.accounts.config;
    config.burned = config.burned.saturating_add(amount);
    config.vault_bump = bump;

    emit!(SupplyBurned {
        amount,
        total_burned: config.burned,
        minted: config.minted,
    });

    msg!("burned {} — total {}", amount, config.burned);
    Ok(())
}

/// E = hf. `minted` is f; the burn is what h*f bought and destroyed.
#[event]
pub struct SupplyBurned {
    pub amount: u64,
    pub total_burned: u64,
    pub minted: u64,
}
