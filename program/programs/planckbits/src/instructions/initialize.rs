use anchor_lang::prelude::*;

use crate::constants::*;
use crate::state::Config;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, Config>,

    /// Holds mint fees. A bare SOL account owned by the program, so it needs
    /// no data and no rent beyond the minimum.
    /// CHECK: a PDA that only ever holds lamports; seeds are verified here.
    #[account(mut, seeds = [TREASURY_SEED], bump)]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_initialize(ctx: Context<Initialize>, mint_price: Option<u64>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.planck_mint = Pubkey::default();
    config.mint_price = mint_price.unwrap_or(DEFAULT_MINT_PRICE);
    config.minted = 0;
    config.burned = 0;
    config.collected = 0;
    config.bump = ctx.bumps.config;
    config.treasury_bump = ctx.bumps.treasury;
    config.vault_bump = 0;

    msg!("planckbits open. h = {} lamports", config.mint_price);
    Ok(())
}
