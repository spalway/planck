import { describe, expect, it } from "vitest"

import { EMPTY, pct, shortAddress, usd } from "@/lib/format"

describe("usd", () => {
  it("formats with two decimals and a thousands separator", () => {
    expect(usd(4610.6275)).toBe("$4,610.63")
  })

  it("keeps four decimals for sub-dollar prices, where cents hide the move", () => {
    expect(usd(1.141)).toBe("$1.1410")
  })

  it("renders the em dash for null and undefined rather than $0", () => {
    expect(usd(null)).toBe(EMPTY)
    expect(usd(undefined)).toBe(EMPTY)
  })

  it("renders the em dash for NaN and Infinity", () => {
    expect(usd(NaN)).toBe(EMPTY)
    expect(usd(Infinity)).toBe(EMPTY)
  })

  it("formats a real zero as a price", () => {
    expect(usd(0)).toBe("$0.0000")
  })
})

describe("pct", () => {
  it("signs a gain", () => {
    expect(pct(0.9742)).toBe("+0.97%")
  })

  it("signs a loss", () => {
    expect(pct(-0.2919)).toBe("-0.29%")
  })

  it("renders the em dash for null", () => {
    expect(pct(null)).toBe(EMPTY)
  })
})

describe("shortAddress", () => {
  it("elides the middle of a wallet address", () => {
    expect(shortAddress("7pt9tkctJPK7PPNQJ77GKg8ZffSF6QxoMiCFYHxrtaCj")).toBe("7pt9…taCj")
  })

  it("leaves a string shorter than the cut alone", () => {
    expect(shortAddress("abc")).toBe("abc")
  })
})
