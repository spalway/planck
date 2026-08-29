import { describe, expect, it } from "vitest"

import { ROSTER, type Broker } from "@/lib/brokers"
import {
  brokerLayers,
  composeSprite,
  spriteGround,
  spritePalette,
} from "@/lib/sprite-compose"

const B: Broker = {
  id: "PB-001",
  name: "MARL FARRAR",
  desk: "credit",
  tier: "common",
  nerve: 50,
  latency: 50,
  coverage: 3,
  effectiveNerve: 50,
  tenureHours: 0,
}

describe("composeSprite", () => {
  it("returns a well-formed 24x24 grid for every broker on the floor", () => {
    for (const b of ROSTER) {
      const rows = composeSprite(b)
      expect(rows, b.id).toHaveLength(24)
      rows.forEach((r, i) => expect(r.length, `${b.id} row ${i}`).toBe(24))
    }
  })

  it("never wears more than two accessories", () => {
    // A third erases the face at this size. The sprite shows a broker's
    // strongest traits, not all of them.
    for (const b of ROSTER) {
      const l = brokerLayers(b)
      const worn = [l.headwear, l.eyewear, l.mouth].filter((x) => x !== "none")
      expect(worn.length, `${b.id} wears ${worn.join(", ")}`).toBeLessThanOrEqual(2)
    }
  })

  it("caps accessories even for a broker maxed on every stat", () => {
    const maxed: Broker = { ...B, effectiveNerve: 100, latency: 1, coverage: 9 }
    const l = brokerLayers(maxed)
    const worn = [l.headwear, l.eyewear, l.mouth].filter((x) => x !== "none")
    expect(worn).toHaveLength(2)
    expect(() => composeSprite(maxed)).not.toThrow()
  })

  it("keeps a palette entry for every glyph it draws", () => {
    // A missing entry renders as a hole in the portrait.
    for (const b of ROSTER) {
      const pal = spritePalette(b)
      for (const row of composeSprite(b)) {
        for (const ch of row) {
          if (ch === ".") continue
          expect(pal[ch], `${b.id} glyph "${ch}"`).toBeTruthy()
        }
      }
    }
  })

  it("stays within 16 colours so the PNG can be indexed", () => {
    for (const b of ROSTER) {
      const used = new Set<string>()
      const pal = spritePalette(b)
      for (const row of composeSprite(b)) {
        for (const ch of row) used.add(ch === "." ? spriteGround(b) : pal[ch])
      }
      expect(used.size, b.id).toBeLessThanOrEqual(16)
    }
  })

  it("is deterministic", () => {
    expect(composeSprite(B)).toEqual(composeSprite(B))
    expect(spritePalette(B)).toEqual(spritePalette(B))
  })

  it("gives each desk its own garment", () => {
    const seen = new Set<string>()
    for (const desk of ["equities", "index", "bullion", "yield", "credit"] as const) {
      seen.add(brokerLayers({ ...B, desk }).garment)
    }
    expect(seen.size).toBe(5)
  })

  it("gives each desk its own hat", () => {
    const seen = new Set<string>()
    for (const desk of ["equities", "index", "bullion", "yield", "credit"] as const) {
      seen.add(brokerLayers({ ...B, desk, effectiveNerve: 90, coverage: 1 }).headwear)
    }
    expect(seen.size).toBe(5)
  })

  it("changes the ground with the tier", () => {
    expect(spriteGround({ ...B, tier: "common" })).not.toBe(
      spriteGround({ ...B, tier: "legendary" })
    )
  })

  it("changes the fur with the tier", () => {
    expect(spritePalette({ ...B, tier: "common" }).f).not.toBe(
      spritePalette({ ...B, tier: "epic" }).f
    )
  })
})
