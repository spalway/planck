import { describe, expect, it } from "vitest"

import type { PriceMap } from "@/lib/jupiter-price"
import { deskTotals, recordFor, recordsFor, vaultTotals } from "@/lib/records"

const NVDAX = "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg"
const TSLAX = "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB"
const USDY = "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6"

function priced(entries: Record<string, number>): PriceMap {
  return Object.fromEntries(
    Object.entries(entries).map(([mint, usdPrice]) => [
      mint,
      { mint, usdPrice, priceChange24h: null, fetchedAt: Date.now() },
    ])
  )
}

describe("recordFor", () => {
  it("computes a gain from cost basis and live price", () => {
    // 10 units cost $2000 total; now worth $250 each = $2500.
    const r = recordFor(
      { mint: NVDAX, quantity: 10, costBasisUsd: 2000 },
      priced({ [NVDAX]: 250 })
    )
    expect(r.marketValueUsd).toBe(2500)
    expect(r.pnlUsd).toBe(500)
    expect(r.pnlPct).toBeCloseTo(25)
  })

  it("computes a loss", () => {
    const r = recordFor(
      { mint: NVDAX, quantity: 10, costBasisUsd: 3000 },
      priced({ [NVDAX]: 250 })
    )
    expect(r.pnlUsd).toBe(-500)
    expect(r.pnlPct).toBeCloseTo(-16.6667)
  })

  it("leaves every derived field null when the price is missing", () => {
    const r = recordFor({ mint: NVDAX, quantity: 10, costBasisUsd: 2000 }, {})
    expect(r.livePrice).toBeNull()
    expect(r.marketValueUsd).toBeNull()
    expect(r.pnlUsd).toBeNull()
    expect(r.pnlPct).toBeNull()
  })

  it("returns a null percentage rather than Infinity on a zero cost basis", () => {
    const r = recordFor(
      { mint: NVDAX, quantity: 10, costBasisUsd: 0 },
      priced({ [NVDAX]: 250 })
    )
    expect(r.pnlUsd).toBe(2500)
    expect(r.pnlPct).toBeNull()
  })

  it("handles a zero-quantity holding without dividing by zero", () => {
    const r = recordFor(
      { mint: NVDAX, quantity: 0, costBasisUsd: 0 },
      priced({ [NVDAX]: 250 })
    )
    expect(r.marketValueUsd).toBe(0)
    expect(r.pnlPct).toBeNull()
  })
})

describe("recordsFor", () => {
  it("maps every holding, priced or not", () => {
    const out = recordsFor(
      [
        { mint: NVDAX, quantity: 1, costBasisUsd: 100 },
        { mint: TSLAX, quantity: 1, costBasisUsd: 100 },
      ],
      priced({ [NVDAX]: 250 })
    )
    expect(out).toHaveLength(2)
    expect(out[0].pnlUsd).toBe(150)
    expect(out[1].pnlUsd).toBeNull()
  })
})

describe("deskTotals", () => {
  it("sums only the holdings on that desk", () => {
    const holdings = [
      { mint: NVDAX, quantity: 10, costBasisUsd: 2000 },
      { mint: USDY, quantity: 1000, costBasisUsd: 1000 },
    ]
    const t = deskTotals(holdings, priced({ [NVDAX]: 250, [USDY]: 1.14 }), "equities")
    expect(t.costUsd).toBe(2000)
    expect(t.valueUsd).toBe(2500)
    expect(t.pnlPct).toBeCloseTo(25)
  })

  it("reports a null value when any holding on the desk is unpriced", () => {
    const holdings = [
      { mint: NVDAX, quantity: 10, costBasisUsd: 2000 },
      { mint: TSLAX, quantity: 10, costBasisUsd: 2000 },
    ]
    const t = deskTotals(holdings, priced({ [NVDAX]: 250 }), "equities")
    // A partial sum would understate the desk and read as a crash.
    expect(t.valueUsd).toBeNull()
    expect(t.pnlPct).toBeNull()
    expect(t.costUsd).toBe(4000)
  })

  it("returns zero cost and null value for a desk with no holdings", () => {
    const t = deskTotals([], {}, "credit")
    expect(t.costUsd).toBe(0)
    expect(t.valueUsd).toBeNull()
  })
})

describe("vaultTotals", () => {
  it("aggregates across desks and counts how many are priced", () => {
    const holdings = [
      { mint: NVDAX, quantity: 10, costBasisUsd: 2000 },
      { mint: USDY, quantity: 1000, costBasisUsd: 1000 },
    ]
    const t = vaultTotals(holdings, priced({ [NVDAX]: 250, [USDY]: 1.14 }))
    expect(t.costUsd).toBe(3000)
    expect(t.valueUsd).toBeCloseTo(3640)
    expect(t.pnlUsd).toBeCloseTo(640)
    expect(t.priced).toBe(2)
    expect(t.total).toBe(2)
  })

  it("nulls the value when coverage is incomplete but still reports the count", () => {
    const holdings = [
      { mint: NVDAX, quantity: 10, costBasisUsd: 2000 },
      { mint: TSLAX, quantity: 10, costBasisUsd: 2000 },
    ]
    const t = vaultTotals(holdings, priced({ [NVDAX]: 250 }))
    expect(t.valueUsd).toBeNull()
    expect(t.priced).toBe(1)
    expect(t.total).toBe(2)
  })
})
