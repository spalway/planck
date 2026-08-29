use anchor_lang::prelude::*;

use crate::constants::*;
use crate::state::Config;

#[derive(Accounts)]
pub struct SetPlanckMint<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, Config>,
}

/// Point the burn at the token, once it exists.
///
/// Launching is one transaction and no redeploy, for the same reason the
/// contract address lives in Postgres rather than the bundle: a rebuild on
/// the one day it matters most is minutes of downtime with the wrong address
/// on the site the whole time.
pub fn handle_set_planck_mint(ctx: Context<SetPlanckMint>, mint: Pubkey) -> Result<()> {
    ctx.accounts.config.planck_mint = mint;
    msg!("planck mint set to {}", mint);
    Ok(())
}
