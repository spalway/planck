use anchor_lang::prelude::*;

#[error_code]
pub enum PlanckError {
    #[msg("this wallet has already minted a broker")]
    AlreadyMinted,
    #[msg("this broker already carries a portrait; it cannot be replaced")]
    AlreadyInscribed,
    #[msg("no SPL Memo instruction was found in this transaction")]
    MemoMissing,
    #[msg("the memo carried no bytes")]
    MemoEmpty,
    #[msg("the memo is larger than a portrait should ever be")]
    MemoTooLarge,
    #[msg("only the broker's owner may inscribe it")]
    NotOwner,
    #[msg("$PLANCK has not launched yet")]
    TokenNotLaunched,
    #[msg("the burn vault is empty; there is nothing to destroy")]
    NothingToBurn,
    #[msg("the slot hashes sysvar could not be read")]
    SlotHashUnavailable,
}
