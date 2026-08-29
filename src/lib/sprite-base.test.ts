import { describe, expect, it } from "vitest"

import { BASE_ROWS, SPRITE_SIZE } from "@/lib/sprite-base"

describe("base grid", () => {
  it("is 24 rows", () => {
    expect(BASE_ROWS).toHaveLength(SPRITE_SIZE)
  })

  it("has every row exactly the grid width", () => {
    // One miscounted character skews every pixel after it on that row.
    BASE_ROWS.forEach((row, i) => {
      expect(row.length, `row ${i}: "${row}"`).toBe(SPRITE_SIZE)
    })
  })

  it("is mirror-symmetric on every row", () => {
    // The base carries no asymmetric feature. Only the mouth layer may break
    // the axis, and it is applied later.
    BASE_ROWS.forEach((row, i) => {
      expect([...row].reverse().join(""), `row ${i}`).toBe(row)
    })
  })

  it("uses only declared glyphs", () => {
    const allowed = new Set([".", "o", "f", "d", "m", "e", "p", "n", "b", "c"])
    for (const row of BASE_ROWS) {
      for (const ch of row) expect(allowed.has(ch), `glyph "${ch}"`).toBe(true)
    }
  })

  it("draws a face: eyes above a muzzle above shoulders", () => {
    expect(BASE_ROWS[8]).toContain("p") // pupils
    expect(BASE_ROWS[12]).toContain("m") // muzzle
    expect(BASE_ROWS[20]).toContain("b") // body
  })
})
