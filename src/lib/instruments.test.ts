import { describe, expect, it } from "vitest"

import {
  ALL_MINTS,
  DESKS,
  INSTRUMENTS,
  instrumentByMint,
  instrumentsForBroker,
  instrumentsForDesk,
} from "@/lib/instruments"

/** Base58, no 0/O/I/l, and Solana mints are 32-44 chars. */
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

describe("INSTRUMENTS", () => {
  it("holds exactly 13 verified instruments", () => {
    expect(INSTRUMENTS).toHaveLength(13)
  })

  it("has a valid base58 mint for every instrument", () => {
    for (const i of INSTRUMENTS) {
      expect(i.mint, `${i.symbol} mint`).toMatch(BASE58)
    }
  })

  it("has no duplicate mints", () => {
    const mints = INSTRUMENTS.map((i) => i.mint)
    expect(new Set(mints).size).toBe(mints.length)
  })

  it("has no duplicate symbols", () => {
    const symbols = INSTRUMENTS.map((i) => i.symbol)
    expect(new Set(symbols).size).toBe(symbols.length)
  })

  it("assigns every instrument to a declared desk", () => {
    const ids = new Set(DESKS.map((d) => d.id))
    for (const i of INSTRUMENTS) {
      expect(ids.has(i.desk), `${i.symbol} desk`).toBe(true)
    }
  })

  it("leaves no desk empty", () => {
    for (const d of DESKS) {
      expect(instrumentsForDesk(d.id).length, `${d.id}`).toBeGreaterThan(0)
    }
  })

  it("excludes instruments that failed verification", () => {
    // BENJI on Solana is a memecoin, OUSG is a pump.fun impersonation.
    const symbols = INSTRUMENTS.map((i) => i.symbol.toUpperCase())
    expect(symbols).not.toContain("BENJI")
    expect(symbols).not.toContain("OUSG")
  })
})

describe("ALL_MINTS", () => {
  it("covers every instrument exactly once", () => {
    expect(ALL_MINTS).toHaveLength(INSTRUMENTS.length)
    expect(new Set(ALL_MINTS).size).toBe(INSTRUMENTS.length)
  })
})

describe("instrumentByMint", () => {
  it("finds a known mint", () => {
    const found = instrumentByMint("Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg")
    expect(found?.symbol).toBe("NVDAx")
  })

  it("returns undefined for an unknown mint", () => {
    expect(instrumentByMint("nope")).toBeUndefined()
  })
})

describe("instrumentsForDesk", () => {
  it("returns the seven equities", () => {
    expect(instrumentsForDesk("equities")).toHaveLength(7)
  })

  it("returns the single yield instrument", () => {
    const y = instrumentsForDesk("yield")
    expect(y).toHaveLength(1)
    expect(y[0].symbol).toBe("USDY")
  })
})

describe("instrumentsForBroker", () => {
  const BROKER = {
    id: "PB-001",
    desk: "equities" as const,
    coverage: 3,
  }

  it("assigns exactly coverage instruments when the desk is deep enough", () => {
    expect(instrumentsForBroker(BROKER)).toHaveLength(3)
  })

  it("caps at the desk size — a YIELD broker cannot cover nine of one thing", () => {
    // This is the coverage-overflow rule made visible. Surplus already
    // converts to nerve; the card must not claim instruments that do not exist.
    expect(instrumentsForBroker({ ...BROKER, desk: "yield", coverage: 9 })).toHaveLength(1)
  })

  it("only ever assigns instruments from the broker's own desk", () => {
    for (const d of DESKS) {
      for (const inst of instrumentsForBroker({ ...BROKER, desk: d.id, coverage: 9 })) {
        expect(inst.desk, `${d.id} got ${inst.symbol}`).toBe(d.id)
      }
    }
  })

  it("is deterministic for the same broker", () => {
    expect(instrumentsForBroker(BROKER).map((i) => i.mint)).toEqual(
      instrumentsForBroker(BROKER).map((i) => i.mint)
    )
  })

  it("gives different brokers different books", () => {
    const a = instrumentsForBroker(BROKER).map((i) => i.mint).join()
    const b = instrumentsForBroker({ ...BROKER, id: "PB-019" }).map((i) => i.mint).join()
    expect(a).not.toBe(b)
  })

  it("never repeats an instrument within one broker", () => {
    const mints = instrumentsForBroker({ ...BROKER, coverage: 7 }).map((i) => i.mint)
    expect(new Set(mints).size).toBe(mints.length)
  })
})
