use anchor_lang::prelude::*;
use solana_sha256_hasher::hashv;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;

use crate::constants::*;
use crate::error::PlanckError;
use crate::state::{Broker, Config};

#[derive(Accounts)]
pub struct MintBroker<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// Seeded on the owner. A second mint from the same wallet fails because
    /// the account already exists — one per wallet is a fact about the address
    /// space, not a check.
    #[account(
        init,
        payer = owner,
        space = 8 + Broker::INIT_SPACE,
        seeds = [BROKER_SEED, owner.key().as_ref()],
        bump
    )]
    pub broker: Account<'info, Broker>,

    /// CHECK: a PDA that only ever holds lamports; seeds are verified here.
    #[account(mut, seeds = [TREASURY_SEED], bump = config.treasury_bump)]
    pub treasury: UncheckedAccount<'info>,

    /// CHECK: read-only sysvar, address checked against the known id.
    #[account(address = SLOT_HASHES_ID)]
    pub slot_hashes: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// The most recent slot hash.
///
/// Layout is a u64 count followed by (slot: u64, hash: [u8; 32]) entries, so
/// the newest hash sits at bytes 16..48. Read directly because the sysvar is
/// far too large to deserialise inside a program.
fn newest_slot_hash(sysvar: &UncheckedAccount) -> Result<[u8; 32]> {
    let data = sysvar
        .try_borrow_data()
        .map_err(|_| error!(PlanckError::SlotHashUnavailable))?;
    require!(data.len() >= 48, PlanckError::SlotHashUnavailable);

    let mut out = [0u8; 32];
    out.copy_from_slice(&data[16..48]);
    Ok(out)
}

/// Walk a basis-point table. The last entry absorbs any residue.
fn pick_bps(x: u16, table: &[u16; 5]) -> u8 {
    let mut n = x % 10_000;
    for (i, w) in table.iter().enumerate() {
        if n < *w {
            return i as u8;
        }
        n -= *w;
    }
    4
}

pub fn handle_mint_broker(ctx: Context<MintBroker>) -> Result<()> {
    let price = ctx.accounts.config.mint_price;

    // Fee first. A failed transfer must not leave a broker behind.
    invoke(
        &system_instruction::transfer(
            &ctx.accounts.owner.key(),
            &ctx.accounts.treasury.key(),
            price,
        ),
        &[
            ctx.accounts.owner.to_account_info(),
            ctx.accounts.treasury.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    // Rolled from the slot hash at execution, mixed with the owner and the
    // mint ordinal. A caller cannot simulate the roll they will get: the slot
    // moves before the transaction lands. This is grind-RESISTANT, not
    // grind-proof — a bot can retry, but each attempt costs a fresh wallet
    // and the full mint price. Do not claim provable fairness.
    let index = ctx.accounts.config.minted;
    let slot_hash = newest_slot_hash(&ctx.accounts.slot_hashes)?;
    let seed = hashv(&[
        &slot_hash,
        ctx.accounts.owner.key().as_ref(),
        &index.to_le_bytes(),
    ])
    .to_bytes();

    let desk = pick_bps(u16::from_le_bytes([seed[0], seed[1]]), &DESK_BPS);
    let tier = pick_bps(u16::from_le_bytes([seed[2], seed[3]]), &TIER_BPS);
    let nerve = (seed[4] % MAX_NERVE) + 1;
    let latency = (seed[5] % 100) + 1;
    let coverage = (seed[6] % MAX_COVERAGE) + 1;

    // Surplus coverage converts to nerve, so a high roll is never inert on a
    // one-instrument desk.
    let surplus = coverage.saturating_sub(DESK_SIZE[desk as usize]);
    let effective_nerve = nerve.saturating_add(surplus).min(MAX_NERVE);

    let clock = Clock::get()?;
    let broker = &mut ctx.accounts.broker;
    broker.owner = ctx.accounts.owner.key();
    broker.desk = desk;
    broker.tier = tier;
    broker.nerve = nerve;
    broker.latency = latency;
    broker.coverage = coverage;
    broker.effective_nerve = effective_nerve;
    broker.image_hash = [0u8; 32];
    broker.index = index;
    broker.minted_at = clock.unix_timestamp;
    broker.slot = clock.slot;
    broker.bump = ctx.bumps.broker;

    let config = &mut ctx.accounts.config;
    config.minted = config.minted.saturating_add(1);
    config.collected = config.collected.saturating_add(price);

    emit!(BrokerMinted {
        broker: broker.key(),
        owner: broker.owner,
        index,
        desk,
        tier,
        nerve,
        latency,
        coverage,
        effective_nerve,
    });

    Ok(())
}

#[event]
pub struct BrokerMinted {
    pub broker: Pubkey,
    pub owner: Pubkey,
    pub index: u64,
    pub desk: u8,
    pub tier: u8,
    pub nerve: u8,
    pub latency: u8,
    pub coverage: u8,
    pub effective_nerve: u8,
}
