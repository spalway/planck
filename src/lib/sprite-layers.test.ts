import { describe, expect, it } from "vitest"

import { BASE_ROWS, fromGrid, toGrid, type Grid } from "@/lib/sprite-base"
import {
  EYEWEAR,
  EYEWEAR_ROWS,
  GARMENT,
  GARMENT_ROWS,
  HEADWEAR,
  HEADWEAR_ROWS,
  MOUTH,
  MOUTH_ROWS,
} from "@/lib/sprite-layers"

/** Rows this layer actually changed, relative to the untouched base. */
function touchedRows(apply: (g: Grid) => void): number[] {
  const g = toGrid(BASE_ROWS)
  apply(g)
  const after = fromGrid(g)
  const out: number[] = []
  after.forEach((row, i) => {
    if (row !== BASE_ROWS[i]) out.push(i)
  })
  return out
}

const CASES = [
  ["headwear", HEADWEAR, HEADWEAR_ROWS],
  ["eyewear", EYEWEAR, EYEWEAR_ROWS],
  ["mouth", MOUTH, MOUTH_ROWS],
  ["garment", GARMENT, GARMENT_ROWS],
] as const

describe("layers stay inside their row band", () => {
  // The first pass let hat brims reach the eye line. Every broker looked
  // blindfolded and all five hats read as the same wide band.
  it.each(CASES)("%s", (_name, table, band) => {
    const [lo, hi] = band
    for (const [id, apply] of Object.entries(table)) {
      for (const r of touchedRows(apply)) {
        expect(r, `${id} drew on row ${r}`).toBeGreaterThanOrEqual(lo)
        expect(r, `${id} drew on row ${r}`).toBeLessThanOrEqual(hi)
      }
    }
  })
})

describe("layers keep the grid well-formed", () => {
  it.each(CASES)("%s rows stay 24 wide", (_name, table) => {
    for (const [id, apply] of Object.entries(table)) {
      const g = toGrid(BASE_ROWS)
      apply(g)
      fromGrid(g).forEach((row, i) => {
        expect(row.length, `${id} row ${i}`).toBe(24)
      })
    }
  })
})

describe("only the mouth breaks the axis", () => {
  it.each([
    ["headwear", HEADWEAR],
    ["eyewear", EYEWEAR],
    ["garment", GARMENT],
  ] as const)("%s is mirror-symmetric", (_name, table) => {
    for (const [id, apply] of Object.entries(table)) {
      const g = toGrid(BASE_ROWS)
      apply(g)
      fromGrid(g).forEach((row, i) => {
        expect([...row].reverse().join(""), `${id} row ${i}`).toBe(row)
      })
    }
  })

  it("mouth accessories are deliberately asymmetric", () => {
    // A cigarette pointing at the viewer is an unreadable dot. Angled out it
    // reads instantly, and it is the only thing off the axis.
    const g = toGrid(BASE_ROWS)
    MOUTH.cigarette(g)
    const flipped = fromGrid(g).some((row) => [...row].reverse().join("") !== row)
    expect(flipped).toBe(true)
  })
})

describe("every variant is distinct", () => {
  it("no two headwear options render the same", () => {
    const seen = new Map<string, string>()
    for (const [id, apply] of Object.entries(HEADWEAR)) {
      const g = toGrid(BASE_ROWS)
      apply(g)
      const key = fromGrid(g).join("|")
      expect(seen.has(key), `${id} is identical to ${seen.get(key)}`).toBe(false)
      seen.set(key, id)
    }
  })
})
