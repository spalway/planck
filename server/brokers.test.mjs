import { describe, expect, it } from "vitest"

import { DESKS, instrumentsForDesk } from "@/lib/instruments"
import { effectiveNerve as clientEffectiveNerve } from "@/lib/brokers"
import {
  DESK_IDS,
  DESK_SIZE,
  effectiveNerve,
  rollBroker,
} from "../server/brokers.mjs"

/** Deterministic stand-in for Math.random. */
function seeded(values) {
  let i = 0
  return () => values[i++ % values.length]
}

describe("server/client parity", () => {
  it("knows the same desks as the client", () => {
    expect([...DESK_IDS].sort()).toEqual(DESKS.map((d) => d.id).sort())
  })

  it("has the same instrument count per desk as the client", () => {
    // Drift here silently corrupts the coverage-overflow rule for every
    // broker minted afterwards, and nothing else would catch it.
    for (const d of DESKS) {
      expect(DESK_SIZE[d.id], d.id).toBe(instrumentsForDesk(d.id).length)
    }
  })

  it("computes effective nerve identically to the client", () => {
    for (const desk of DESK_IDS) {
      for (let nerve = 1; nerve <= 100; nerve += 7) {
        for (let coverage = 1; coverage <= 9; coverage++) {
          const traits = { desk, nerve, latency: 50, coverage }
          expect(effectiveNerve(traits), `${desk} n${nerve} c${coverage}`).toBe(
            clientEffectiveNerve(traits)
          )
        }
      }
    }
  })
})

describe("rollBroker", () => {
  it("rolls every stat inside its bounds", () => {
    for (let i = 0; i < 500; i++) {
      const b = rollBroker()
      expect(b.nerve).toBeGreaterThanOrEqual(1)
      expect(b.nerve).toBeLessThanOrEqual(100)
      expect(b.latency).toBeGreaterThanOrEqual(1)
      expect(b.latency).toBeLessThanOrEqual(100)
      expect(b.coverage).toBeGreaterThanOrEqual(1)
      expect(b.coverage).toBeLessThanOrEqual(9)
      expect(b.effective_nerve).toBeLessThanOrEqual(100)
      expect(DESK_IDS).toContain(b.desk)
    }
  })

  it("is deterministic for a given sequence", () => {
    const seq = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
    expect(rollBroker(seeded(seq))).toEqual(rollBroker(seeded(seq)))
  })

  it("names every broker", () => {
    expect(rollBroker().name).toMatch(/^[A-Z]+ [A-Z]+$/)
  })

  it("uses snake_case for the column the database expects", () => {
    // The row is inserted verbatim; effectiveNerve would silently not persist.
    expect(rollBroker()).toHaveProperty("effective_nerve")
  })

  it("weights the deepest desk highest over many rolls", () => {
    const counts = Object.fromEntries(DESK_IDS.map((d) => [d, 0]))
    for (let i = 0; i < 4000; i++) counts[rollBroker().desk]++
    expect(counts.equities).toBeGreaterThan(counts.yield)
  })
})
