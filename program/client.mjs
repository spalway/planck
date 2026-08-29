/**
 * Drive the deployed program end to end: mint a broker, render its portrait
 * from the traits the CHAIN rolled, then inscribe that portrait into a
 * transaction and verify the stored hash.
 *
 * Instruction data is hand-encoded rather than going through an Anchor client,
 * so this depends only on @solana/web3.js. An Anchor discriminator is the
 * first 8 bytes of sha256("global:<snake_case_name>").
 */

import {
  Connection, Keypair, PublicKey, SystemProgram,
  Transaction, TransactionInstruction, sendAndConfirmTransaction,
} from "@solana/web3.js"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"

import { portraitFor, brokerFromChain } from "./portrait.mjs"

const RPC = process.env.RPC ?? "http://127.0.0.1:8899"
const PROGRAM_ID = new PublicKey("2SCL1yBjXxnhqTUrF1MrEtxmLFZJaxoqCeCPUi5mijFt")
const MEMO_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
const SLOT_HASHES = new PublicKey("SysvarS1otHashes111111111111111111111111111")
const INSTRUCTIONS = new PublicKey("Sysvar1nstructions1111111111111111111111111")

const sha256 = (b) => createHash("sha256").update(b).digest()
const disc = (name) => sha256(`global:${name}`).subarray(0, 8)
const pda = (seeds) => PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0]

const connection = new Connection(RPC, "confirmed")
const authority = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(process.env.HOME + "/.config/solana/id.json", "utf8")))
)

const config = pda([Buffer.from("config")])
const treasury = pda([Buffer.from("treasury")])

const line = (s) => console.log(s)

// ---------------------------------------------------------------- initialize
if ((await connection.getAccountInfo(config)) === null) {
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: config, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    // Option<u64> = None
    data: Buffer.concat([disc("initialize"), Buffer.from([0])]),
  })
  const sig = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authority])
  line(`initialize    ${sig}`)
} else {
  line("initialize    (already open)")
}

// ------------------------------------------------------------------ the mint
// A fresh wallet, because one broker per wallet is enforced by the PDA seed.
const owner = Keypair.generate()
await connection.confirmTransaction(
  await connection.requestAirdrop(owner.publicKey, 2_000_000_000),
  "confirmed"
)
const broker = pda([Buffer.from("broker"), owner.publicKey.toBuffer()])

const treasuryBefore = (await connection.getBalance(treasury)) ?? 0

const mintIx = new TransactionInstruction({
  programId: PROGRAM_ID,
  keys: [
    { pubkey: owner.publicKey, isSigner: true, isWritable: true },
    { pubkey: config, isSigner: false, isWritable: true },
    { pubkey: broker, isSigner: false, isWritable: true },
    { pubkey: treasury, isSigner: false, isWritable: true },
    { pubkey: SLOT_HASHES, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  data: disc("mint_broker"),
})
const mintSig = await sendAndConfirmTransaction(connection, new Transaction().add(mintIx), [owner])
line(`mint_broker   ${mintSig}`)

const treasuryAfter = (await connection.getBalance(treasury)) ?? 0
line(`fee paid      ${(treasuryAfter - treasuryBefore) / 1e9} SOL  (h)`)

// --------------------------------------------------------- read what it rolled
function decodeBroker(data) {
  let o = 8
  const owner = new PublicKey(data.subarray(o, o + 32)); o += 32
  const desk = data[o++], tier = data[o++], nerve = data[o++]
  const latency = data[o++], coverage = data[o++], effectiveNerve = data[o++]
  const imageHash = Buffer.from(data.subarray(o, o + 32)); o += 32
  const index = Number(data.readBigUInt64LE(o)); o += 8
  const mintedAt = Number(data.readBigInt64LE(o)); o += 8
  const slot = Number(data.readBigUInt64LE(o)); o += 8
  return { owner: owner.toBase58(), desk, tier, nerve, latency, coverage,
           effectiveNerve, imageHash, index, mintedAt, slot }
}

const raw = (await connection.getAccountInfo(broker)).data
const b = decodeBroker(raw)
const view = brokerFromChain(b)

line("")
line("--- the chain rolled ---")
line(`broker        ${broker.toBase58()}`)
line(`name          ${view.name}   (${view.id})`)
line(`desk / tier   ${view.desk.toUpperCase()} / ${view.tier.toUpperCase()}`)
line(`nerve         ${b.nerve} -> ${b.effectiveNerve} effective`)
line(`latency       ${b.latency}`)
line(`coverage      ${b.coverage}`)
line(`image_hash    ${b.imageHash.toString("hex").slice(0, 16)}...  (zero = not inscribed)`)

// ------------------------------------------------------------------- inscribe
const portrait = await portraitFor(b)
line("")
line(`portrait      ${portrait.length} base64 chars`)

const memoIx = new TransactionInstruction({
  programId: MEMO_ID,
  keys: [],
  data: Buffer.from(portrait, "utf8"),
})
const inscribeIx = new TransactionInstruction({
  programId: PROGRAM_ID,
  keys: [
    { pubkey: owner.publicKey, isSigner: true, isWritable: false },
    { pubkey: broker, isSigner: false, isWritable: true },
    { pubkey: INSTRUCTIONS, isSigner: false, isWritable: false },
  ],
  data: disc("inscribe"),
})

const tx = new Transaction().add(memoIx).add(inscribeIx)
tx.feePayer = owner.publicKey
tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
const size = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).length
line(`tx size       ${size} bytes  (limit 1232)`)

const inscribeSig = await sendAndConfirmTransaction(connection, tx, [owner])
line(`inscribe      ${inscribeSig}`)

// -------------------------------------------------------------------- verify
const after = decodeBroker((await connection.getAccountInfo(broker)).data)
const expected = sha256(Buffer.from(portrait, "utf8"))
const ok = after.imageHash.equals(expected)

line("")
line("--- verification ---")
line(`stored hash   ${after.imageHash.toString("hex")}`)
line(`sha256(memo)  ${expected.toString("hex")}`)
line(`match         ${ok ? "YES" : "NO"}`)

// Prove the memo really is in the transaction, read back off chain.
const fetched = await connection.getTransaction(inscribeSig, {
  commitment: "confirmed",
  maxSupportedTransactionVersion: 0,
})
const msg = fetched.transaction.message
const keys = msg.staticAccountKeys ?? msg.accountKeys
const memoData = msg.compiledInstructions
  ? msg.compiledInstructions
      .filter((i) => keys[i.programIdIndex].equals(MEMO_ID))
      .map((i) => Buffer.from(i.data).toString("utf8"))[0]
  : null

line("")
line("--- read back out of the transaction ---")
line(`recovered     ${memoData ? memoData.length + " chars" : "not found"}`)
line(`identical     ${memoData === portrait ? "YES" : "NO"}`)
line("")
line("paste this into a base64 image decoder:")
line("")
line(memoData ?? portrait)

if (!ok || memoData !== portrait) process.exit(1)
