import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { clearCache, walletHolding } from "./birdeye.mjs"

/**
 * The holding gate.
 *
 * Everything token-gated hangs off this one call, and its dangerous failure
 * mode is silent: report a real holder as empty and they are locked out of
 * minting while the gate looks like it is working. These cases exist to keep
 * "no position" and "could not tell" from ever collapsing into each other.
 */

const WALLET = "7pt9tkctJPK7PPNQJ77GKg8ZffSF6QxoMiCFYHxrtaCj"
const MINT = "So11111111111111111111111111111111111111112"
const KEY = "test-key"

function reply(body, { status = 200 } = {}) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }))
}

beforeEach(() => clearCache())
afterEach(() => vi.unstubAllGlobals())

describe("walletHolding", () => {
  it("reports a holder", async () => {
    vi.stubGlobal("fetch", reply({ success: true, data: { uiAmount: 25_000 } }))
    const r = await walletHolding(WALLET, MINT, KEY)
    expect(r).toMatchObject({ holds: true, amount: 25_000 })
  })

  it("reports a wallet with a zero balance as not holding", async () => {
    vi.stubGlobal("fetch", reply({ success: true, data: { uiAmount: 0 } }))
    const r = await walletHolding(WALLET, MINT, KEY)
    expect(r).toMatchObject({ holds: false, amount: 0 })
  })

  it("treats a 404 as no position rather than an error", async () => {
    vi.stubGlobal("fetch", reply({}, { status: 404 }))
    const r = await walletHolding(WALLET, MINT, KEY)
    expect(r).toMatchObject({ holds: false, amount: 0 })
  })

  it("treats a null data payload as no position", async () => {
    vi.stubGlobal("fetch", reply({ success: true, data: null }))
    const r = await walletHolding(WALLET, MINT, KEY)
    expect(r).toMatchObject({ holds: false, amount: 0 })
  })

  it("falls back to the string amount", async () => {
    vi.stubGlobal("fetch", reply({ success: true, data: { uiAmountString: "1234.5" } }))
    const r = await walletHolding(WALLET, MINT, KEY)
    expect(r.amount).toBe(1234.5)
  })

  it("falls back to raw base units and decimals", async () => {
    vi.stubGlobal("fetch", reply({ success: true, data: { balance: 1_500_000, decimals: 6 } }))
    const r = await walletHolding(WALLET, MINT, KEY)
    expect(r).toMatchObject({ holds: true, amount: 1.5 })
  })

  it("THROWS rather than reporting a holder as empty when the shape is unknown", async () => {
    // The regression that matters. This used to yield NaN -> holds:false, so
    // a genuine holder was told they hold nothing and could not mint.
    vi.stubGlobal("fetch", reply({ success: true, data: { somethingElse: 1 } }))
    await expect(walletHolding(WALLET, MINT, KEY)).rejects.toThrow(/unrecognised/i)
  })

  it("throws when Birdeye reports failure in a 200 body", async () => {
    vi.stubGlobal("fetch", reply({ success: false, message: "bad request" }))
    await expect(walletHolding(WALLET, MINT, KEY)).rejects.toThrow()
  })

  it("never puts the API key in the error it throws", async () => {
    vi.stubGlobal("fetch", reply({ message: `bad key ${KEY}` }, { status: 401 }))
    await expect(walletHolding(WALLET, MINT, KEY)).rejects.toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(KEY) })
    )
  })

  it("caches so a refresh does not spend a second request", async () => {
    const f = reply({ success: true, data: { uiAmount: 10 } })
    vi.stubGlobal("fetch", f)

    await walletHolding(WALLET, MINT, KEY)
    await walletHolding(WALLET, MINT, KEY)

    expect(f).toHaveBeenCalledTimes(1)
  })

  it("sends the key as a header, never in the URL", async () => {
    const f = reply({ success: true, data: { uiAmount: 1 } })
    vi.stubGlobal("fetch", f)
    await walletHolding(WALLET, MINT, KEY)

    const [url, init] = f.mock.calls[0]
    // A key in a query string ends up in logs, proxies and referrers.
    expect(url).not.toContain(KEY)
    expect(init.headers["X-API-KEY"]).toBe(KEY)
  })
})
