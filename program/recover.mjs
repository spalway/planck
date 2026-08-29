/**
 * Recover a portrait from the chain, the way a stranger would.
 *
 * Takes only an inscribe signature: pulls the transaction, finds the memo,
 * decodes the base64 and writes the PNG. Nothing is passed in by hand, which
 * is the point — if this works, the image really is in the transaction.
 *
 *   node program/recover.mjs <signature> [out.png] [--devnet]
 *
 * Note what this script does NOT import: the roster, the sprite composer, the
 * palette. It is the check anyone can run against us, so it has to work with
 * no knowledge of how the portrait was made.
 */

import { Connection, PublicKey } from "@solana/web3.js"
import { createHash } from "node:crypto"
import { writeFileSync } from "node:fs"

const MEMO_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"))
const sig = args[0]
const out = args[1] ?? "recovered.png"
if (!sig) throw new Error("usage: node program/recover.mjs <signature> [out.png] [--devnet]")

const RPC =
  process.argv.find((a) => a.startsWith("--rpc="))?.slice(6) ??
  (process.argv.includes("--devnet") ? "https://api.devnet.solana.com" : null) ??
  process.env.RPC ??
  "http://127.0.0.1:8899"

const connection = new Connection(RPC, "confirmed")
const tx = await connection.getTransaction(sig, {
  commitment: "confirmed",
  maxSupportedTransactionVersion: 0,
})
if (!tx) throw new Error(`transaction ${sig} not found`)

const msg = tx.transaction.message
const keys = msg.staticAccountKeys ?? msg.accountKeys
const memo = msg.compiledInstructions
  .filter((i) => keys[i.programIdIndex].equals(MEMO_ID))
  .map((i) => Buffer.from(i.data).toString("utf8"))[0]

if (!memo) throw new Error("no memo instruction in that transaction")

const png = Buffer.from(memo, "base64")
writeFileSync(out, png)

console.log(`signature   ${sig}`)
console.log(`memo        ${memo.length} base64 chars`)
console.log(`sha256      ${createHash("sha256").update(Buffer.from(memo, "utf8")).digest("hex")}`)
console.log(`png bytes   ${png.length}`)
console.log(`magic       ${png.subarray(0, 8).toString("hex")}  (expect 89504e470d0a1a0a)`)
console.log(`wrote       ${out}`)
