/**
 * Drive the deployed program end to end: mint a broker, render its portrait
 * from the traits the CHAIN rolled, then inscribe that portrait into a
 * transaction and verify the stored hash.
 *
 *   npm run chain:local     against a local validator
 *   npm run chain:devnet    against devnet, printing explorer links
 *
 * Instruction data is hand-encoded rather than going through an Anchor client,
 * so this depends only on @solana/web3.js. An Anchor discriminator is the
 * first 8 bytes of sha256("global:<snake_case_name>").
 *
 * The art is bundled out of src/ at run time rather than kept as a checked-in
 * copy. The whole claim this script makes is that the portrait on chain is
 * the portrait the site renders, and a second copy of the renderer would be
 * exactly the thing that quietly stops being true.
 */

import { execSync } from "node:child_process"
import {
  Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram,
  Transaction, TransactionInstruction, sendAndConfirmTransaction,
} from "@solana/web3.js"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, rmSync } from "node:fs"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const bundle = `${root}program/.portrait-bundle.mjs`

// Through a shell: npx resolves to npx.cmd on Windows and spawning a .cmd
// directly is EINVAL on current Node. Same call shape as make-social.mjs.
execSync(
  `npx esbuild src/lib/onchain-portrait.ts --bundle --format=esm ` +
    `--alias:@=./src --outfile="${bundle}" --log-level=error`,
  { cwd: root, stdio: "inherit" }
)
const { portraitFor, brokerFromChain } = await import(`file://${bundle}`)
process.on("exit", () => rmSync(bundle, { force: true }))

// A flag rather than only an env var: `RPC=... npm run` is not portable to
// PowerShell, and this gets run from Windows as often as from WSL.
const RPC =
  process.argv.find((a) => a.startsWith("--rpc="))?.slice(6) ??
  (process.argv.includes("--devnet") ? "https://api.devnet.solana.com" : null) ??
  process.env.RPC ??
  "http://127.0.0.1:8899"
const CLUSTER = RPC.includes("devnet")
  ? "devnet"
  : RPC.includes("mainnet") || RPC.includes("helius")
    ? "mainnet-beta"
    : null
/** Explorer link. Nothing on a local validator, which nobody else can reach. */
const link = (kind, id) => {
  if (CLUSTER) console.log(`              https://explorer.solana.com/${kind}/${id}?cluster=${CLUSTER}`)
}
const PROGRAM_ID = new PublicKey("2SCL1yBjXxnhqTUrF1MrEtxmLFZJaxoqCeCPUi5mijFt")
const MEMO_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
const SLOT_HASHES = new PublicKey("SysvarS1otHashes111111111111111111111111111")
const INSTRUCTIONS = new PublicKey("Sysvar1nstructions1111111111111111111111111")

const sha256 = (b) => createHash("sha256").update(b).digest()
const disc = (name) => sha256(`global:${name}`).subarray(0, 8)
const pda = (seeds) => PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0]

const connection = new Connection(RPC, "confirmed")

// The wallet lives in WSL (programs cannot build on native Windows) but this
// script runs wherever node_modules is, which is usually the Windows side. So
// the path is a flag, with the two obvious defaults tried first.
const KEYPAIR =
  process.argv.find((a) => a.startsWith("--keypair="))?.slice(10) ??
  process.env.SOLANA_KEYPAIR ??
  [process.env.HOME, process.env.USERPROFILE]
    .filter(Boolean)
    .map((h) => `${h}/.config/solana/id.json`)
    .find((p) => existsSync(p))

if (!KEYPAIR || !existsSync(KEYPAIR)) {
  console.error("No keypair found. Pass one:")
  console.error("  npm run chain:devnet -- --keypair=//wsl$/Ubuntu/home/<you>/.config/solana/id.json")
  process.exit(1)
}
const authority = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(KEYPAIR, "utf8")))
)

const config = pda([Buffer.from("config")])
const treasury = pda([Buffer.from("treasury")])

const line = (s) => console.log(s)

/**
 * Wrapped in main() rather than run at top level so failures can return.
 * process.exit() tears the process down while web3.js still holds an open
 * handle, which trips a libuv assertion on Windows and prints "Assertion
 * failed" over whatever the real error was.
 */
async function main() {
  // ------------------------------------------------------------------ preflight
  // Failing here with a clear sentence beats failing four instructions later
  // with "Attempt to load a program that does not exist".
  const programAccount = await connection.getAccountInfo(PROGRAM_ID)
  if (programAccount === null) {
    line(`The program is not deployed at ${PROGRAM_ID.toBase58()} on ${RPC}.`)
    line(`Deploy it first:  anchor deploy --provider.cluster ${CLUSTER ?? "localnet"}`)
    return 1
  }
  line(`cluster       ${CLUSTER ?? "localnet"}  (${RPC})`)
  line(`program       ${PROGRAM_ID.toBase58()}`)
  link("address", PROGRAM_ID.toBase58())
  line(`payer         ${authority.publicKey.toBase58()}`)
  line(`payer balance ${(await connection.getBalance(authority.publicKey)) / LAMPORTS_PER_SOL} SOL`)
  line("")

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
  const STAKE = LAMPORTS_PER_SOL / 5 // the 0.1 fee, plus rent and two signatures

  if (CLUSTER === null) {
    // Local validator: free money.
    await connection.confirmTransaction(
      await connection.requestAirdrop(owner.publicKey, 2 * LAMPORTS_PER_SOL),
      "confirmed"
    )
  } else {
    // Devnet's faucet is rate-limited to the point of being unusable in a
    // script, so the demo wallet is funded by the payer rather than begged for.
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey: owner.publicKey,
          lamports: STAKE,
        })
      ),
      [authority]
    )
  }
  line(`demo wallet   ${owner.publicKey.toBase58()}  (fresh — one broker per wallet)`)

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
  link("tx", mintSig)

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
  link("tx", inscribeSig)

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
  //
  // With a retry: confirmation and history are not the same thing on a public
  // cluster, and getTransaction returns null for a few seconds after a
  // signature confirms. On a local validator the first call always wins.
  let fetched = null
  for (let i = 0; i < 15 && fetched === null; i++) {
    fetched = await connection.getTransaction(inscribeSig, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    })
    if (fetched === null) await new Promise((r) => setTimeout(r, 2000))
  }
  if (fetched === null) throw new Error(`${inscribeSig} confirmed but is not in history yet`)

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
  line("")
  line("or rebuild the PNG from nothing but the signature:")
  line(`  node program/recover.mjs ${inscribeSig} broker.png --rpc=${RPC}`)

  if (!ok || memoData !== portrait) return 1

  return 0
}

process.exitCode = await main()
