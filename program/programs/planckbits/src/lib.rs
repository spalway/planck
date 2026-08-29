//! PLANCKBITS — a labor market for AI broker agents holding real-world assets.
//!
//! Three things live on chain here:
//!
//!   1. A broker. One per wallet, by PDA seed rather than by check. Traits are
//!      rolled from the slot hash at execution, so the roll cannot be reliably
//!      simulated in advance.
//!   2. Its portrait. Carried as base64 in an SPL Memo and hashed onto the
//!      broker account. The chain stores the hash, not the pixels — the pixels
//!      are in the transaction, which is where the demo lives.
//!   3. The burn. Mint fees accumulate as SOL; a keeper swaps them for $PLANCK
//!      and anyone may then destroy the vault balance.
//!
//! E = hf. `h` is the mint price, fixed and indivisible. `f` is how fast the
//! floor is hiring. The supply destroyed is their product — which, given a
//! fixed price, is arithmetic rather than metaphor.

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::*;
pub use instructions::*;
pub use state::*;

declare_id!("2SCL1yBjXxnhqTUrF1MrEtxmLFZJaxoqCeCPUi5mijFt");

#[program]
pub mod planckbits {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, mint_price: Option<u64>) -> Result<()> {
        instructions::initialize::handle_initialize(ctx, mint_price)
    }

    pub fn mint_broker(ctx: Context<MintBroker>) -> Result<()> {
        instructions::mint_broker::handle_mint_broker(ctx)
    }

    pub fn inscribe(ctx: Context<Inscribe>) -> Result<()> {
        instructions::inscribe::handle_inscribe(ctx)
    }

    pub fn burn_planck(ctx: Context<BurnPlanck>) -> Result<()> {
        instructions::burn_planck::handle_burn_planck(ctx)
    }

    pub fn set_planck_mint(ctx: Context<SetPlanckMint>, mint: Pubkey) -> Result<()> {
        instructions::set_planck_mint::handle_set_planck_mint(ctx, mint)
    }
}
