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
 * Whether a wallet holds the token, and how much.
 *
 * Returns holds:false rather than an error when the wallet simply has no
 * account for the mint — not holding is an ordinary answer, not a failure.
 */
export async function walletHolding(wallet, mint, apiKey, signal) {
  const key = `hold:${wallet}:${mint}`
  const hit = cached(key)
  if (hit) return hit

  let json
  try {
    json = await birdeye(
      `/v1/wallet/token_balance?wallet=${encodeURIComponent(wallet)}&token_address=${encodeURIComponent(mint)}`,
      apiKey,
      signal
    )
  } catch (e) {
    // Birdeye 404s a wallet with no position in the mint.
    if (e.status === 404) return remember(key, { wallet, mint, holds: false, amount: 0 })
    throw e
  }

  const d = json?.data
  const amount = Number(d?.uiAmount)

  return remember(key, {
    wallet,
    mint,
    holds: Number.isFinite(amount) && amount > 0,
    amount: Number.isFinite(amount) ? amount : 0,
  })
}

/** Exported for tests — lets a case start from a known-empty cache. */
export function clearCache() {
  cache.clear()
}
