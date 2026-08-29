use anchor_lang::prelude::*;
use solana_instructions_sysvar as ix_sysvar;
use solana_sha256_hasher::hash;

use crate::constants::*;
use crate::error::PlanckError;
use crate::state::Broker;

/// Nothing larger than this is a 24x24 portrait, and an unsigned SPL Memo
/// tops out near 566 bytes at the default compute budget anyway.
pub const MAX_MEMO_LEN: usize = 566;

#[derive(Accounts)]
pub struct Inscribe<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [BROKER_SEED, owner.key().as_ref()],
        bump = broker.bump,
        has_one = owner @ PlanckError::NotOwner
    )]
    pub broker: Account<'info, Broker>,

    /// CHECK: read-only sysvar, address checked against the known id.
    #[account(address = INSTRUCTIONS_ID)]
    pub instructions: UncheckedAccount<'info>,
}

/// Hash the portrait riding in this transaction's memo.
///
/// The traits are rolled on chain, so the client cannot know them when it
/// builds the mint — which means it cannot render the portrait in advance.
/// Inscription is therefore a second transaction, and it is the one that
/// carries the image. The memo holds nothing but base64, so it decodes
/// cleanly on its own.
///
/// The program cannot render a PNG, so it cannot check the image against the
/// traits. It stores a hash of what it is shown. Anyone may re-render from
/// the on-chain traits and compare, which makes a faked inscription publicly
/// detectable — and that, not a proof, is what the site should claim.
pub fn handle_inscribe(ctx: Context<Inscribe>) -> Result<()> {
    require!(
        ctx.accounts.broker.image_hash == [0u8; 32],
        PlanckError::AlreadyInscribed
    );

    let ix_account = ctx.accounts.instructions.to_account_info();
    let current = ix_sysvar::load_current_index_checked(&ix_account)?;

    // Take the last memo before this instruction, so a memo appended after us
    // cannot be mistaken for the portrait.
    let mut memo: Option<Vec<u8>> = None;
    for i in 0..current {
        let ix = ix_sysvar::load_instruction_at_checked(i as usize, &ix_account)?;
        if ix.program_id == MEMO_PROGRAM_ID {
            memo = Some(ix.data.clone());
        }
    }

    let data = memo.ok_or(error!(PlanckError::MemoMissing))?;
    require!(!data.is_empty(), PlanckError::MemoEmpty);
    require!(data.len() <= MAX_MEMO_LEN, PlanckError::MemoTooLarge);

    let digest = hash(&data).to_bytes();
    ctx.accounts.broker.image_hash = digest;

    emit!(BrokerInscribed {
        broker: ctx.accounts.broker.key(),
        owner: ctx.accounts.owner.key(),
        bytes: data.len() as u16,
        image_hash: digest,
    });

    Ok(())
}

#[event]
pub struct BrokerInscribed {
    pub broker: Pubkey,
    pub owner: Pubkey,
    pub bytes: u16,
    pub image_hash: [u8; 32],
}
