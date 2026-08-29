/**
 * Recover a portrait from the chain, the way a stranger would.
 *
 * Takes only an inscribe signature: pulls the transaction, finds the memo,
 * decodes the base64 and writes the PNG. Nothing is passed in by hand, which
 * is the point — if this works, the image really is in the transaction.
 */

import { Connection, PublicKey } from "@solana/web3.js"
import { createHash } from "node:crypto"
import { writeFileSync } from "node:fs"

const MEMO_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
const sig = process.argv[2]
const out = process.argv[3] ?? "recovered.png"

const connection = new Connection(process.env.RPC ?? "http://127.0.0.1:8899", "confirmed")
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
