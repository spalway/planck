import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  WORDMARK_CELL,
  WORDMARK_GLYPHS,
  WORDMARK_TEXT,
  Wordmark,
  snapHeight,
} from "@/components/wordmark"

/**
 * The logotype used to be a woff2 that never decoded — truncated by one byte
 * before it was first committed, so every browser rejected it and fell back
 * to Geist Mono. Drawing it removes the failure mode entirely; these keep the
 * drawing honest.
 */
describe("Wordmark", () => {
  it("has a glyph for every letter it renders", () => {
    // A missing glyph would silently drop a letter rather than error.
    for (const ch of WORDMARK_TEXT) {
      expect(WORDMARK_GLYPHS[ch], `no glyph for "${ch}"`).toBeDefined()
    }
  })

  it("draws every glyph the same height", () => {
    const { H } = WORDMARK_CELL
    for (const [ch, rows] of Object.entries(WORDMARK_GLYPHS)) {
      expect(rows, `glyph "${ch}" row count`).toHaveLength(H)
    }
  })

  it("keeps each glyph rectangular", () => {
    // Width varies BETWEEN glyphs — that is the point — but a ragged row
    // inside one glyph would shift its pixels sideways and skew the letter.
    for (const [ch, rows] of Object.entries(WORDMARK_GLYPHS)) {
      const width = rows[0].length
      rows.forEach((row, i) => {
        expect(row.length, `glyph "${ch}" row ${i}: "${row}"`).toBe(width)
      })
    }
  })

  it("gives narrow letters narrow cells", () => {
    // The disjointed look was every glyph padded to a fixed 5 columns, so a
    // 1px "i" sat in a 4px hole while the round letters nearly touched.
    expect(WORDMARK_GLYPHS.i[0].length).toBeLessThan(WORDMARK_GLYPHS.o[0].length)
    expect(WORDMARK_GLYPHS.t[0].length).toBeLessThan(WORDMARK_GLYPHS.b[0].length)
  })

  it("uses every row it declares", () => {
    // The descender row went when the name lost its "p". A row no glyph
    // touches is a blank strip inside the mark's own box, which makes it sit
    // high against anything aligned to it.
    const { H } = WORDMARK_CELL
    for (let y = 0; y < H; y++) {
      const touched = Object.values(WORDMARK_GLYPHS).some((g) => g[y].includes("#"))
      expect(touched, `row ${y} is empty in every glyph`).toBe(true)
    }
  })

  it("carries a glyph for every letter in the word, and no others", () => {
    // Renaming the site is exactly where this breaks: a missing glyph renders
    // as a hole, and a leftover one is dead art nobody notices.
    const used = new Set(WORDMARK_TEXT.split(""))
    for (const ch of used) {
      expect(WORDMARK_GLYPHS[ch], `no glyph for "${ch}"`).toBeDefined()
    }
    for (const ch of Object.keys(WORDMARK_GLYPHS)) {
      expect(used.has(ch), `glyph "${ch}" is unused`).toBe(true)
    }
  })

  it("uses only on and off cells", () => {
    for (const [ch, rows] of Object.entries(WORDMARK_GLYPHS)) {
      for (const row of rows) {
        expect(row, `glyph "${ch}" has an unexpected character`).toMatch(/^[.#]+$/)
      }
    }
  })

  it("is announced as an image with the word as its name", () => {
    render(<Wordmark />)
    expect(screen.getByRole("img", { name: WORDMARK_TEXT })).toBeInTheDocument()
  })

  it("keeps its aspect ratio at any height", () => {
    // Derived from the grid, not a literal: this asserted 40px, which only
    // passed while the grid happened to be 8 rows tall.
    const { H } = WORDMARK_CELL
    const asked = H * 5
    const { container } = render(<Wordmark height={asked} />)
    const svg = container.querySelector("svg")!
    const [, , cols, rows] = svg.getAttribute("viewBox")!.split(" ").map(Number)

    expect(Number(svg.getAttribute("height"))).toBe(asked)
    expect(Number(svg.getAttribute("width"))).toBeCloseTo((asked * cols) / rows, 5)
  })

  it("snaps an awkward height to a whole number of pixels per cell", () => {
    // A fractional cell is what made the nav mark render visibly softer than
    // the hero. Pixel art only scales by integers.
    const { H } = WORDMARK_CELL
    const { container } = render(<Wordmark height={H * 5 + 3} />)
    expect(Number(container.querySelector("svg")!.getAttribute("height")) % H).toBe(0)
  })

  it("inherits colour rather than hardcoding one", () => {
    // The mark sits on the brown bar, on bone, and as its own tan shadow.
    const { container } = render(<Wordmark />)
    expect(container.querySelector("svg")!.getAttribute("fill")).toBe("currentColor")
  })

  it("renders a rect per lit cell", () => {
    const lit = WORDMARK_TEXT.split("")
      .flatMap((ch) => WORDMARK_GLYPHS[ch])
      .join("")
      .split("")
      .filter((c) => c === "#").length

    const { container } = render(<Wordmark />)
    expect(container.querySelectorAll("rect")).toHaveLength(lit)
  })
})

describe("pixel scaling", () => {
  it("snaps any height to whole pixels per cell", () => {
    const { H } = WORDMARK_CELL
    for (const requested of [10, 17, 18, 19, 23, 30, 47, 81]) {
      expect(snapHeight(requested) % H, `height ${requested}`).toBe(0)
    }
  })

  it("never collapses to zero", () => {
    expect(snapHeight(1)).toBeGreaterThan(0)
    expect(snapHeight(0)).toBeGreaterThan(0)
  })

  it("renders on whole pixels even when asked for a fractional scale", () => {
    // 18px over an 8-row grid is 2.25px per cell — the blur that made the nav
    // wordmark look softer than the hero.
    const { container } = render(<Wordmark height={18} />)
    const svg = container.querySelector("svg")!
    const { H } = WORDMARK_CELL

    const rendered = Number(svg.getAttribute("height"))
    expect(rendered % H).toBe(0)
    expect(Number.isInteger(rendered / H)).toBe(true)
  })

  it("keeps width an integer multiple too, so columns do not smear", () => {
    const { container } = render(<Wordmark height={24} />)
    const svg = container.querySelector("svg")!
    const [, , cols, rows] = svg.getAttribute("viewBox")!.split(" ").map(Number)
    const cell = Number(svg.getAttribute("height")) / rows

    expect(Number.isInteger(cell)).toBe(true)
    expect(Number(svg.getAttribute("width"))).toBe(cell * cols)
  })
})
