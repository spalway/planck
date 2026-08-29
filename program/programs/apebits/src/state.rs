use anchor_lang::prelude::*;

/// Firm-wide state. One per deployment.
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    /// `Pubkey::default()` until the token launches. Nothing burns before then.
    pub ape_mint: Pubkey,
    /// `h`, in lamports.
    pub mint_price: u64,
    /// `f` — brokers hired. The burn is `h * f`, so this is the whole story.
    pub minted: u64,
    /// Cumulative $APE destroyed, in base units.
    pub burned: u64,
    /// Cumulative lamports taken in mint fees.
    pub collected: u64,
    pub bump: u8,
    pub treasury_bump: u8,
    pub vault_bump: u8,
}

/// One broker. The PDA is seeded on its owner, so a wallet can hold exactly
/// one — enforced by the address space rather than by a check that could be
/// raced or forgotten.
#[account]
#[derive(InitSpace)]
pub struct Broker {
    pub owner: Pubkey,
    /// 0 equities · 1 index · 2 bullion · 3 yield · 4 credit
    pub desk: u8,
    /// 0 common · 1 uncommon · 2 rare · 3 epic · 4 legendary. COSMETIC.
    pub tier: u8,
    pub nerve: u8,
    pub latency: u8,
    pub coverage: u8,
    /// Surplus coverage converted to nerve. Stored so the roster can sort on
    /// it without every reader re-deriving the overflow rule.
    pub effective_nerve: u8,
    /// SHA-256 of the base64 portrait. Zero until inscribed.
    ///
    /// The program cannot render a PNG, so it cannot prove this matches the
    /// traits. Anyone can: re-render from the traits above, hash, compare.
    /// A faked inscription is publicly detectable, which is the honest claim.
    pub image_hash: [u8; 32],
    /// Mint ordinal, from `Config::minted`.
    pub index: u64,
    pub minted_at: i64,
    pub slot: u64,
    pub bump: u8,
}
