/**
 * Jupiter Price API v3.
 *
 * Called straight from the browser. Jupiter answers with
 * `access-control-allow-origin` echoing the caller and `cache-control:
 * max-age=5`, so there is no proxy, no key, and nothing to leak — unlike
 * tokens.xyz, which needs a server hop.
 *
 * Prices are requested by MINT, never by symbol. See instruments.ts for why.
 */

const PRICE_API = "https://lite-api.jup.ag/price/v3"

/** Past this, a quote renders with a stale badge rather than as current. */
export const PRICE_MAX_AGE_MS = 60_000

export type PriceQuote = {
  mint: string
  usdPrice: number
  /** Percent, signed. Null when Jupiter did not supply one. */
  priceChange24h: number | null
  fetchedAt: number
}

export type PriceMap = Record<string, PriceQuote>

/** The subset of Jupiter's payload we rely on. */
type RawQuote = {
  usdPrice?: number | null
  priceChange24h?: number | null
}

/**
 * Fetch USD prices for the given mints.
 *
 * Returns null when the request itself failed, and an object when it
 * succeeded — possibly a partial one. A mint Jupiter did not price is simply
 * absent from the map. It is never defaulted to zero: a wrong price is worse
 * than a missing one, because the UI can render "—" for absent but cannot
 * detect a fabricated 0.
 */
export async function fetchPrices(
  mints: readonly string[],
  signal?: AbortSignal
): Promise<PriceMap | null> {
  if (mints.length === 0) return null

  const qs = new URLSearchParams({ ids: mints.join(",") })

  try {
    const res = await fetch(`${PRICE_API}?${qs}`, { signal })
    if (!res.ok) return null

    const raw = (await res.json()) as Record<string, RawQuote>
    const fetchedAt = Date.now()
    const out: PriceMap = {}

    for (const [mint, q] of Object.entries(raw ?? {})) {
      const usdPrice = q?.usdPrice
      if (typeof usdPrice !== "number" || !Number.isFinite(usdPrice)) continue

      const change = q?.priceChange24h
      out[mint] = {
        mint,
        usdPrice,
        priceChange24h: typeof change === "number" ? change : null,
        fetchedAt,
      }
    }

    return out
  } catch (e) {
    if ((e as Error).name !== "AbortError") {
      console.warn("[PLANCKBITS] Jupiter price fetch failed:", e)
    }
    return null
  }
}

export function isStale(q: PriceQuote, now: number = Date.now()): boolean {
  return now - q.fetchedAt >= PRICE_MAX_AGE_MS
}
