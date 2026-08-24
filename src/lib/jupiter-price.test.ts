import { afterEach, describe, expect, it, vi } from "vitest"

import { PRICE_MAX_AGE_MS, fetchPrices, isStale } from "@/lib/jupiter-price"

const MINT_A = "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6"
const MINT_B = "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg"

/** Shape copied from a real Jupiter v3 response. */
const RESPONSE = {
  [MINT_A]: { usdPrice: 1.1410288, decimals: 6, priceChange24h: -0.2919 },
  [MINT_B]: { usdPrice: 259.495, decimals: 8, priceChange24h: 0.1583 },
}

function mockFetch(body: unknown, ok = true) {
  const f = vi.fn().mockResolvedValue({ ok, json: async () => body })
  vi.stubGlobal("fetch", f)
  return f
}

afterEach(() => vi.unstubAllGlobals())

describe("fetchPrices", () => {
  it("maps the response into quotes keyed by mint", async () => {
    mockFetch(RESPONSE)
    const out = await fetchPrices([MINT_A, MINT_B])
    expect(out?.[MINT_A].usdPrice).toBeCloseTo(1.1410288)
    expect(out?.[MINT_B].usdPrice).toBeCloseTo(259.495)
    expect(out?.[MINT_B].priceChange24h).toBeCloseTo(0.1583)
  })

  it("stamps fetchedAt on every quote", async () => {
    mockFetch(RESPONSE)
    const before = Date.now()
    const out = await fetchPrices([MINT_A])
    expect(out?.[MINT_A].fetchedAt).toBeGreaterThanOrEqual(before)
  })

  it("sends mints as a comma-separated ids param", async () => {
    const f = mockFetch(RESPONSE)
    await fetchPrices([MINT_A, MINT_B])
    const url = String(f.mock.calls[0][0])
    expect(url).toContain(`ids=${MINT_A}%2C${MINT_B}`)
  })

  it("returns null on a non-ok response rather than throwing", async () => {
    mockFetch({}, false)
    expect(await fetchPrices([MINT_A])).toBeNull()
  })

  it("returns null on a network error rather than throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
    expect(await fetchPrices([MINT_A])).toBeNull()
  })

  it("skips entries with a missing or non-numeric price, never coercing to 0", async () => {
    mockFetch({ [MINT_A]: { usdPrice: null }, [MINT_B]: { usdPrice: 259.5 } })
    const out = await fetchPrices([MINT_A, MINT_B])
    expect(out?.[MINT_A]).toBeUndefined()
    expect(out?.[MINT_B].usdPrice).toBe(259.5)
  })

  it("returns an empty map, not null, when the response is empty", async () => {
    mockFetch({})
    expect(await fetchPrices([MINT_A])).toEqual({})
  })

  it("returns null without calling fetch when given no mints", async () => {
    const f = mockFetch(RESPONSE)
    expect(await fetchPrices([])).toBeNull()
    expect(f).not.toHaveBeenCalled()
  })

  it("treats a null priceChange24h as unknown rather than zero", async () => {
    mockFetch({ [MINT_A]: { usdPrice: 1.14 } })
    const out = await fetchPrices([MINT_A])
    expect(out?.[MINT_A].priceChange24h).toBeNull()
  })
})

describe("isStale", () => {
  const quote = { mint: MINT_A, usdPrice: 1, priceChange24h: null, fetchedAt: 1000 }

  it("is fresh inside the max age", () => {
    expect(isStale(quote, 1000 + PRICE_MAX_AGE_MS - 1)).toBe(false)
  })

  it("is stale at and beyond the max age", () => {
    expect(isStale(quote, 1000 + PRICE_MAX_AGE_MS)).toBe(true)
  })
})
