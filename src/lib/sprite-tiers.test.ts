import { describe, expect, it } from "vitest"

import { TIERS, rollTier, tierById, type TierId } from "@/lib/sprite-tiers"

describe("tier table", () => {
  it("odds sum to exactly 1", () => {
    // Anything else silently biases the roll toward the last tier.
    const total = TIERS.reduce((a, t) => a + t.odds, 0)
    expect(total).toBeCloseTo(1, 10)
  })

  it("runs common to legendary, rarest last", () => {
    const odds = TIERS.map((t) => t.odds)
    expect(odds).toEqual([...odds].sort((a, b) => b - a))
  })

  it("gives every tier at least one fur pair and one ground", () => {
    for (const t of TIERS) {
      expect(t.furs.length, t.id).toBeGreaterThan(0)
      expect(t.grounds.length, t.id).toBeGreaterThan(0)
      for (const [main, shadow] of t.furs) {
        expect(main, `${t.id} fur`).toMatch(/^#[0-9a-f]{6}$/)
        expect(shadow, `${t.id} shadow`).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })

  it("marks epic and legendary as dark ground", () => {
    // Non-natural fur needs a dark ground or the cyan vanishes into cream.
    expect(tierById("epic").dark).toBe(true)
    expect(tierById("legendary").dark).toBe(true)
    expect(tierById("common").dark).toBe(false)
  })
})

describe("rollTier", () => {
  it("returns common at the bottom of the range and legendary at the top", () => {
    expect(rollTier(() => 0)).toBe("common")
    expect(rollTier(() => 0.999999)).toBe("legendary")
  })

  it("lands within tolerance of the declared odds over many rolls", () => {
    let seed = 12345
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const counts = new Map<TierId, number>()
    const N = 200_000
    for (let i = 0; i < N; i++) {
      const t = rollTier(rand)
      counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    for (const t of TIERS) {
      const actual = (counts.get(t.id) ?? 0) / N
      expect(Math.abs(actual - t.odds), `${t.id} ${actual}`).toBeLessThan(0.01)
    }
  })
})
