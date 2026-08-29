use anchor_lang::prelude::*;

pub const CONFIG_SEED: &[u8] = b"config";
pub const BROKER_SEED: &[u8] = b"broker";
pub const TREASURY_SEED: &[u8] = b"treasury";
pub const VAULT_SEED: &[u8] = b"burn_vault";

/// `h` in E = hf: the indivisible price of one unit of labor. 0.1 SOL.
///
/// You cannot hire half a broker, and the price does not scale with anything.
/// That is what makes the burn quantised rather than continuous.
pub const DEFAULT_MINT_PRICE: u64 = 100_000_000;

/// Desk odds in basis points, weighted by the square root of desk depth.
///
/// MUST match `deskRollOdds()` in src/lib/brokers.ts. Raw proportional
/// weighting put 13 of 24 brokers on EQUITIES; the square root keeps the
/// ordering while giving the shallow desks a real presence. Integers here
/// rather than a float sqrt, because BPF floating point is best avoided.
pub const DESK_BPS: [u16; 5] = [3541, 1892, 1892, 1338, 1337];

/// Tier odds in basis points. MUST match `TIERS` in src/lib/sprite-tiers.ts.
pub const TIER_BPS: [u16; 5] = [6200, 2500, 900, 350, 50];

/// Instruments per desk. MUST match `INSTRUMENTS` in src/lib/instruments.ts.
///
/// Drift here silently corrupts the coverage-overflow rule for every broker
/// minted afterwards, which is why the client asserts these are equal.
pub const DESK_SIZE: [u8; 5] = [7, 2, 2, 1, 1];

pub const MAX_NERVE: u8 = 100;
pub const MAX_COVERAGE: u8 = 9;

/// SPL Memo v2. The portrait rides in a memo so it decodes cleanly on its own.
#[constant]
pub const MEMO_PROGRAM_ID: Pubkey = pubkey!("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/// SlotHashes sysvar. A fixed, permanent address.
///
/// `solana_program::sysvar::slot_hashes` no longer exists — Anchor 1.x split
/// the monolithic crate up — and the replacement crate carries the container
/// type rather than the id, so the address is named here directly.
pub const SLOT_HASHES_ID: Pubkey = pubkey!("SysvarS1otHashes111111111111111111111111111");

/// Instructions sysvar. Named here rather than imported so the tests, which
/// cannot see the program's own dependencies, read the same constant.
pub const INSTRUCTIONS_ID: Pubkey = pubkey!("Sysvar1nstructions1111111111111111111111111");
