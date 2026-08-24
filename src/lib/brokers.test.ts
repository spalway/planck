import { describe, expect, it } from "vitest"

import { ROSTER, effectiveNerve, rollBroker } from "@/lib/brokers"
import { DESKS, instrumentsForDesk } from "@/lib/instruments"

/** Deterministic stand-in for Math.random, cycling a fixed sequence. */
function seeded(values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

describe("effectiveNerve", () => {
  it("leaves nerve alone when coverage fits the desk", () => {
    // equities holds 7 instruments, so coverage 3 is fully usable.
    expect(effectiveNerve({ desk: "equities", nerve: 40, latency: 10, coverage: 3 })).toBe(40)
  })

  it("converts surplus coverage into nerve on a single-instrument desk", () => {
    // yield holds 1 instrument, so 4 of the 5 coverage points are surplus.
    expect(effectiveNerve({ desk: "yield", nerve: 40, latency: 10, coverage: 5 })).toBe(44)
  })

  it("caps effective nerve at 100", () => {
    expect(effectiveNerve({ desk: "credit", nerve: 98, latency: 10, coverage: 9 })).toBe(100)
  })

  it("adds nothing when coverage exactly equals the desk size", () => {
    const n = instrumentsForDesk("bullion").length
    expect(effectiveNerve({ desk: "bullion", nerve: 50, latency: 10, coverage: n })).toBe(50)
  })
})

describe("rollBroker", () => {
  it("is deterministic for a given random sequence", () => {
    const a = rollBroker("b1", seeded([0.1, 0.2, 0.3, 0.4, 0.5]))
    const b = rollBroker("b1", seeded([0.1, 0.2, 0.3, 0.4, 0.5]))
    expect(a).toEqual(b)
  })

  it("rolls stats inside their declared bounds", () => {
    for (let i = 0; i < 200; i++) {
      const b = rollBroker(`b${i}`, Math.random)
      expect(b.nerve).toBeGreaterThanOrEqual(1)
      expect(b.nerve).toBeLessThanOrEqual(100)
      expect(b.latency).toBeGreaterThanOrEqual(1)
      expect(b.latency).toBeLessThanOrEqual(100)
      expect(b.coverage).toBeGreaterThanOrEqual(1)
      expect(b.effectiveNerve).toBeLessThanOrEqual(100)
      expect(Number.isInteger(b.nerve)).toBe(true)
    }
  })

  it("assigns a real desk", () => {
    const ids = new Set(["equities", "index", "bullion", "yield", "credit"])
    for (let i = 0; i < 100; i++) {
      expect(ids.has(rollBroker(`b${i}`, Math.random).desk)).toBe(true)
    }
  })

  it("gives every broker a name", () => {
    expect(rollBroker("b1", Math.random).name).toMatch(/\S/)
  })
})

describe("ROSTER", () => {
  it("holds 24 brokers", () => {
    expect(ROSTER).toHaveLength(24)
  })

  it("has unique ids", () => {
    expect(new Set(ROSTER.map((b) => b.id)).size).toBe(ROSTER.length)
  })

  it("covers every desk, so no desk card renders empty", () => {
    const covered = new Set(ROSTER.map((b) => b.desk))
    expect(covered.size).toBe(5)
  })

  it("puts at least three brokers on every desk", () => {
    // One seed left CREDIT with a single broker beside ten on EQUITIES,
    // which reads as broken rather than lopsided.
    for (const d of DESKS) {
      const n = ROSTER.filter((b) => b.desk === d.id).length
      expect(n, d.id).toBeGreaterThanOrEqual(3)
    }
  })

  it("keeps effectiveNerve consistent with the overflow rule", () => {
    for (const b of ROSTER) {
      expect(b.effectiveNerve).toBe(
        effectiveNerve({
          desk: b.desk,
          nerve: b.nerve,
          latency: b.latency,
          coverage: b.coverage,
        })
      )
    }
  })

  it("gives every broker a unique name", () => {
    // Drawing first and last independently produced four ZEDs and a
    // duplicated SABLE VANCE, which reads as a bug rather than a roster.
    const names = ROSTER.map((b) => b.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it("leaves part of the floor idle, so brokers are actually hireable", () => {
    const idle = ROSTER.filter((b) => b.tenureHours === 0).length
    expect(idle).toBeGreaterThan(0)
    expect(idle).toBeLessThan(ROSTER.length)
  })

  it("puts the most brokers on the deepest desk", () => {
    // EQUITIES carries seven instruments; INDEX carries two. An unweighted
    // roll inverted this and made the flagship desk look abandoned.
    const count = (d: string) => ROSTER.filter((b) => b.desk === d).length
    expect(count("equities")).toBeGreaterThan(count("index"))
  })
})
