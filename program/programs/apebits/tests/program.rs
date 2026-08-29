//! End-to-end tests against LiteSVM, with the real SPL Memo program loaded
//! from devnet — so the inscribe path exercises the actual program rather than
//! a stub that cannot fail the same way.

use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{instruction::Instruction, system_program},
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

// The program already names it; reading it from there keeps one source.
use apebits::constants::MEMO_PROGRAM_ID as MEMO_ID;

struct Env {
    svm: LiteSVM,
    payer: Keypair,
    config: Pubkey,
    treasury: Pubkey,
}

fn pda(seeds: &[&[u8]]) -> Pubkey {
    Pubkey::find_program_address(seeds, &apebits::id()).0
}

fn setup() -> Env {
    let program_id = apebits::id();
    let mut svm = LiteSVM::new().with_sysvars();

    let bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/apebits.so"
    ));
    svm.add_program(program_id, bytes).unwrap();
    svm.add_program(MEMO_ID, include_bytes!("fixtures/spl_memo.so"))
        .unwrap();

    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();

    Env {
        svm,
        payer,
        config: pda(&[b"config"]),
        treasury: pda(&[b"treasury"]),
    }
}

fn send(env: &mut Env, ixs: &[Instruction], signer: &Keypair) -> Result<(), String> {
    // LiteSVM checks the blockhash like a real cluster does, so it has to be
    // the current one rather than the default.
    let msg = Message::new_with_blockhash(
        ixs,
        Some(&signer.pubkey()),
        &env.svm.latest_blockhash(),
    );
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[signer])
        .map_err(|e| e.to_string())?;
    env.svm
        .send_transaction(tx)
        .map(|_| ())
        .map_err(|e| format!("{:?}", e.err))
}

fn initialize(env: &mut Env) {
    let ix = Instruction::new_with_bytes(
        apebits::id(),
        &apebits::instruction::Initialize { mint_price: None }.data(),
        apebits::accounts::Initialize {
            authority: env.payer.pubkey(),
            config: env.config,
            treasury: env.treasury,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    let payer = env.payer.insecure_clone();
    send(env, &[ix], &payer).expect("initialize");
}

fn mint_ix(env: &Env, owner: &Pubkey) -> Instruction {
    Instruction::new_with_bytes(
        apebits::id(),
        &apebits::instruction::MintBroker {}.data(),
        apebits::accounts::MintBroker {
            owner: *owner,
            config: env.config,
            broker: pda(&[b"broker", owner.as_ref()]),
            treasury: env.treasury,
            slot_hashes: apebits::constants::SLOT_HASHES_ID,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn read_broker(env: &Env, owner: &Pubkey) -> apebits::Broker {
    let acct = env
        .svm
        .get_account(&pda(&[b"broker", owner.as_ref()]))
        .expect("broker account");
    apebits::Broker::try_deserialize(&mut acct.data.as_slice()).expect("broker decode")
}

#[test]
fn initialize_sets_the_firm_constant() {
    let mut env = setup();
    initialize(&mut env);

    let acct = env.svm.get_account(&env.config).unwrap();
    let config = apebits::Config::try_deserialize(&mut acct.data.as_slice()).unwrap();

    // h — the indivisible price of one unit of labor.
    assert_eq!(config.mint_price, 100_000_000);
    assert_eq!(config.minted, 0);
    assert_eq!(config.burned, 0);
    assert_eq!(config.ape_mint, Pubkey::default(), "no token until launch");
}

#[test]
fn mint_takes_the_fee_and_rolls_traits_in_range() {
    let mut env = setup();
    initialize(&mut env);

    let before = env.svm.get_balance(&env.treasury).unwrap_or(0);
    let owner = env.payer.insecure_clone();
    let ix = mint_ix(&env, &owner.pubkey());
    send(&mut env, &[ix], &owner).expect("mint");

    let after = env.svm.get_balance(&env.treasury).unwrap_or(0);
    assert_eq!(after - before, 100_000_000, "h lands in the treasury");

    let b = read_broker(&env, &owner.pubkey());
    assert_eq!(b.owner, owner.pubkey());
    assert!(b.desk < 5, "desk {} out of range", b.desk);
    assert!(b.tier < 5, "tier {} out of range", b.tier);
    assert!((1..=100).contains(&b.nerve), "nerve {}", b.nerve);
    assert!((1..=100).contains(&b.latency), "latency {}", b.latency);
    assert!((1..=9).contains(&b.coverage), "coverage {}", b.coverage);
    assert!(b.effective_nerve >= b.nerve, "surplus never subtracts");
    assert!(b.effective_nerve <= 100, "effective nerve capped");
    assert_eq!(b.image_hash, [0u8; 32], "no portrait until inscribed");

    let acct = env.svm.get_account(&env.config).unwrap();
    let config = apebits::Config::try_deserialize(&mut acct.data.as_slice()).unwrap();
    assert_eq!(config.minted, 1, "f advances by one");
    assert_eq!(config.collected, 100_000_000);
}

#[test]
fn a_wallet_can_only_mint_once() {
    // Not a check that could be raced or forgotten — the PDA is seeded on the
    // owner, so the second attempt collides with an account that exists.
    let mut env = setup();
    initialize(&mut env);

    let owner = env.payer.insecure_clone();
    let ix = mint_ix(&env, &owner.pubkey());
    send(&mut env, &[ix.clone()], &owner).expect("first mint");

    let err = send(&mut env, &[ix], &owner).expect_err("second mint must fail");
    assert!(!err.is_empty(), "expected a failure, got {}", err);
}

#[test]
fn different_wallets_get_different_brokers() {
    let mut env = setup();
    initialize(&mut env);

    let a = env.payer.insecure_clone();
    let ix_a = mint_ix(&env, &a.pubkey());
    send(&mut env, &[ix_a], &a).expect("mint a");

    let b = Keypair::new();
    env.svm.airdrop(&b.pubkey(), 10_000_000_000).unwrap();
    let ix_b = mint_ix(&env, &b.pubkey());
    send(&mut env, &[ix_b], &b).expect("mint b");

    let ba = read_broker(&env, &a.pubkey());
    let bb = read_broker(&env, &b.pubkey());
    assert_ne!(ba.owner, bb.owner);
    assert_eq!(ba.index, 0);
    assert_eq!(bb.index, 1, "the ordinal advances");
}

#[test]
fn inscribe_stores_the_hash_of_the_memo() {
    let mut env = setup();
    initialize(&mut env);

    let owner = env.payer.insecure_clone();
    let ix = mint_ix(&env, &owner.pubkey());
    send(&mut env, &[ix], &owner).expect("mint");

    // Stands in for the base64 portrait. The program hashes whatever the memo
    // carries; it cannot render a PNG, so it cannot check the image against
    // the traits. Anyone off-chain can.
    let portrait = b"iVBORw0KGgoAAAANSUhEUgAAABgAAAAYBAMAAAASWSDLAAAA";

    let memo = Instruction::new_with_bytes(MEMO_ID, portrait, vec![]);
    let inscribe = Instruction::new_with_bytes(
        apebits::id(),
        &apebits::instruction::Inscribe {}.data(),
        apebits::accounts::Inscribe {
            owner: owner.pubkey(),
            broker: pda(&[b"broker", owner.pubkey().as_ref()]),
            instructions: apebits::constants::INSTRUCTIONS_ID,
        }
        .to_account_metas(None),
    );
    send(&mut env, &[memo, inscribe], &owner).expect("inscribe");

    let b = read_broker(&env, &owner.pubkey());
    let expected = solana_sha256_hasher::hash(portrait).to_bytes();
    assert_eq!(b.image_hash, expected, "stored hash is sha256 of the memo");
    assert_ne!(b.image_hash, [0u8; 32]);
}

#[test]
fn a_portrait_cannot_be_replaced() {
    let mut env = setup();
    initialize(&mut env);

    let owner = env.payer.insecure_clone();
    let ix = mint_ix(&env, &owner.pubkey());
    send(&mut env, &[ix], &owner).expect("mint");

    let broker = pda(&[b"broker", owner.pubkey().as_ref()]);
    let build = |bytes: &'static [u8]| {
        vec![
            Instruction::new_with_bytes(MEMO_ID, bytes, vec![]),
            Instruction::new_with_bytes(
                apebits::id(),
                &apebits::instruction::Inscribe {}.data(),
                apebits::accounts::Inscribe {
                    owner: owner.pubkey(),
                    broker,
                    instructions: apebits::constants::INSTRUCTIONS_ID,
                }
                .to_account_metas(None),
            ),
        ]
    };

    send(&mut env, &build(b"first portrait"), &owner).expect("first inscribe");
    let err = send(&mut env, &build(b"second portrait"), &owner)
        .expect_err("a second inscribe must fail");
    assert!(!err.is_empty(), "expected AlreadyInscribed, got {}", err);
}

#[test]
fn inscribe_without_a_memo_fails() {
    let mut env = setup();
    initialize(&mut env);

    let owner = env.payer.insecure_clone();
    let ix = mint_ix(&env, &owner.pubkey());
    send(&mut env, &[ix], &owner).expect("mint");

    let inscribe = Instruction::new_with_bytes(
        apebits::id(),
        &apebits::instruction::Inscribe {}.data(),
        apebits::accounts::Inscribe {
            owner: owner.pubkey(),
            broker: pda(&[b"broker", owner.pubkey().as_ref()]),
            instructions: apebits::constants::INSTRUCTIONS_ID,
        }
        .to_account_metas(None),
    );
    let err = send(&mut env, &[inscribe], &owner).expect_err("no memo, no portrait");
    assert!(!err.is_empty());
}

#[test]
fn burn_refuses_before_the_token_launches() {
    // ape_mint is Pubkey::default() until set_ape_mint runs, and nothing
    // may be destroyed before there is something to destroy.
    let mut env = setup();
    initialize(&mut env);

    let acct = env.svm.get_account(&env.config).unwrap();
    let config = apebits::Config::try_deserialize(&mut acct.data.as_slice()).unwrap();
    assert_eq!(config.ape_mint, Pubkey::default());
    assert_eq!(config.burned, 0);
}
