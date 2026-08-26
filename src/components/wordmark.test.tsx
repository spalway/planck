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

  it("draws every glyph on the same grid", () => {
    const { W, H } = WORDMARK_CELL
    for (const [ch, rows] of Object.entries(WORDMARK_GLYPHS)) {
      expect(rows, `glyph "${ch}" row count`).toHaveLength(H)
      rows.forEach((row, i) => {
        expect(row.length, `glyph "${ch}" row ${i}: "${row}"`).toBe(W)
      })
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
    const { container } = render(<Wordmark height={40} />)
    const svg = container.querySelector("svg")!
    const [, , cols, rows] = svg.getAttribute("viewBox")!.split(" ").map(Number)

    expect(Number(svg.getAttribute("height"))).toBe(40)
    expect(Number(svg.getAttribute("width"))).toBeCloseTo((40 * cols) / rows, 5)
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
