/**
 * Birdeye, server-side only.
 *
 * The API key is a secret. It never reaches the browser, which is the entire
 * reason this server exists rather than the client calling Birdeye directly —
 * a VITE_ prefixed key ships to every visitor and can be lifted from the
 * bundle in seconds.
 *
 * Responses are deliberately narrowed. Birdeye returns price, market cap and
 * 24h change on the token endpoint; none of that is forwarded. The site shows
 * a funding line and a contract address, never a price or a chart, and the
 * cheapest way to keep that true is to make the number unavailable to the
 * frontend at all.
 */

const BASE = "https://public-api.birdeye.so"
const CHAIN = "solana"

/** Birdeye rate-limits hard on the free tier; a short cache absorbs refreshes. */
const CACHE_MS = 30_000
const cache = new Map()

function cached(key) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value
  return null
}

function remember(key, value) {
  cache.set(key, { at: Date.now(), value })
  return value
}

async function birdeye(path, apiKey, signal) {
  const res = await fetch(`${BASE}${path}`, {
    signal,
    headers: {
      "X-API-KEY": apiKey,
      "x-chain": CHAIN,
      accept: "application/json",
    },
  })

  if (!res.ok) {
    // Never echo the upstream body — it can contain the key in an error path.
    throw Object.assign(new Error(`birdeye ${res.status}`), { status: res.status })
  }

  return res.json()
}

/**
 * Holder count and supply for the token.
 *
 * Price fields are intentionally dropped rather than passed through.
 */
export async function tokenStats(mint, apiKey, signal) {
  const key = `token:${mint}`
  const hit = cached(key)
  if (hit) return hit

  const json = await birdeye(
    `/defi/token_overview?address=${encodeURIComponent(mint)}`,
    apiKey,
    signal
  )

  const d = json?.data ?? {}
  return remember(key, {
    mint,
    holders: Number.isFinite(d.holder) ? d.holder : null,
    supply: Number.isFinite(d.supply) ? d.supply : null,
    symbol: typeof d.symbol === "string" ? d.symbol : null,
  })
}

/**
 * Read the balance out of whatever shape Birdeye returned.
 *
 * Returns a number, or null meaning "this response does not contain a
 * balance". The distinction between null and 0 is the whole point — see
 * walletHolding.
 */
function readAmount(d) {
  if (d === null || d === undefined) return null

  const ui = Number(d.uiAmount)
  if (Number.isFinite(ui)) return ui

  // Some responses carry the string form instead, which survives balances
  // too large for a float.
  const uiStr = Number(d.uiAmountString)
  if (Number.isFinite(uiStr)) return uiStr

  // Fall back to raw base units and decimals.
  const raw = Number(d.balance ?? d.amount)
  const decimals = Number(d.decimals)
  if (Number.isFinite(raw) && Number.isFinite(decimals)) {
    return raw / 10 ** decimals
  }

  return null
}

/**
 * Whether a wallet holds the token, and how much.
 *
 * The important case is the one in the middle. There are three outcomes, not
 * two:
 *
 *   - the wallet has no position       -> holds: false
 *   - the wallet has a position        -> holds: true
 *   - we could not tell                -> throw
 *
 * Collapsing the third into the first is what this guards against. It used to
 * do exactly that: any response whose shape did not match produced NaN, and
 * NaN silently became holds:false. A real holder would have been told they
 * hold nothing and locked out of minting, with nothing in the logs — the
 * worst kind of failure, because it looks like a working gate.
 *
 * Throwing instead surfaces as a 502, which the frontend already renders as
 * "we could not check your wallet just now" rather than as an accusation.
 */
export async function walletHolding(wallet, mint, apiKey, signal) {
  const key = `hold:${wallet}:${mint}`
  const hit = cached(key)
  if (hit) return hit

  const empty = { wallet, mint, holds: false, amount: 0 }

  let json
  try {
    json = await birdeye(
      `/v1/wallet/token_balance?wallet=${encodeURIComponent(wallet)}&token_address=${encodeURIComponent(mint)}`,
      apiKey,
      signal
    )
  } catch (e) {
    // Birdeye 404s a wallet with no position in the mint. That is an answer,
    // not a failure.
    if (e.status === 404) return remember(key, empty)
    throw e
  }

  if (json?.success === false) {
    throw Object.assign(new Error("birdeye reported failure"), { status: 502 })
  }

  // A successful response with no data is the documented "no position" reply.
  if (json?.data === null || json?.data === undefined) return remember(key, empty)

  const amount = readAmount(json.data)
  if (amount === null) {
    throw Object.assign(
      new Error("birdeye balance shape unrecognised — refusing to report a holder as empty"),
      { status: 502 }
    )
  }

  return remember(key, { wallet, mint, holds: amount > 0, amount })
}

/** Exported for tests — lets a case start from a known-empty cache. */
export function clearCache() {
  cache.clear()
}
