/**
 * The logotype, drawn rather than typeset.
 *
 * It used to be set in Departure Mono, loaded from a woff2 that never once
 * decoded: the file was truncated by a single byte before it was first
 * committed (core.autocrlf stripped it, prior to *.woff2 being marked binary
 * in .gitattributes), so every browser rejected it with an OTS parsing error
 * and silently fell back to Geist Mono. The wordmark has never actually been
 * pixel type.
 *
 * Drawing it as rects fixes that permanently and is the better answer
 * anyway: it is the same technique the broker portraits use, it cannot fail
 * to decode, it costs no font request, and it stays crisp at any size
 * because it is vector underneath.
 *
 * 5x8 cells. Rows 0-1 are the ascender zone, 2-6 the x-height, 7 the
 * descender — so "l", "k", "b" and "t" rise and "p" drops, which is what
 * keeps a lowercase word from reading as a row of blocks.
 */

const W = 5
const H = 8
/** One blank column between letters, so stems never touch. */
const GAP = 1

const GLYPHS: Record<string, string[]> = {
  p: [".....", ".....", "####.", "#...#", "#...#", "#...#", "####.", "#...."],
  l: ["..#..", "..#..", "..#..", "..#..", "..#..", "..#..", "..#..", "....."],
  a: [".....", ".....", ".###.", "....#", ".####", "#...#", ".####", "....."],
  n: [".....", ".....", "#.##.", "##..#", "#...#", "#...#", "#...#", "....."],
  c: [".....", ".....", ".###.", "#...#", "#....", "#...#", ".###.", "....."],
  k: ["#....", "#....", "#...#", "#..#.", "###..", "#..#.", "#...#", "....."],
  b: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "####.", "....."],
  i: ["..#..", ".....", "..#..", "..#..", "..#..", "..#..", "..#..", "....."],
  t: [".#...", ".#...", "####.", ".#...", ".#...", ".#...", "..##.", "....."],
  s: [".....", ".....", ".####", "#....", ".###.", "....#", "####.", "....."],
}

const TEXT = "planckbits"

/** Exported so a test can assert every letter in TEXT has a glyph. */
export const WORDMARK_TEXT = TEXT
export const WORDMARK_GLYPHS = GLYPHS
export const WORDMARK_CELL = { W, H, GAP }

const COLS = TEXT.length * (W + GAP) - GAP

/**
 * Snap a requested height to a whole number of pixels per cell.
 *
 * The grid is H rows tall, so a height that is not a multiple of H puts cell
 * edges on fractions of a pixel and the browser antialiases them. At 18px the
 * nav wordmark was 2.25px per cell and rendered visibly softer and unevenly
 * weighted than the hero, which happened to land on 6px and 10px.
 *
 * Pixel art only scales by integers. Rounding here means callers can ask for
 * any height and still get a crisp mark, rather than having to know the grid.
 */
export function snapHeight(requested: number, rows = H): number {
  return Math.max(1, Math.round(requested / rows)) * rows
}

export function Wordmark({
  height = 24,
  className,
}: {
  /** Rendered height in px. Rounded to the nearest whole pixel per cell. */
  height?: number
  className?: string
}) {
  const snapped = snapHeight(height)
  const rects: React.ReactElement[] = []

  TEXT.split("").forEach((ch, i) => {
    const glyph = GLYPHS[ch]
    if (!glyph) return
    const originX = i * (W + GAP)

    glyph.forEach((row, y) => {
      row.split("").forEach((cell, x) => {
        if (cell !== "#") return
        rects.push(
          <rect key={`${i}-${x}-${y}`} x={originX + x} y={y} width={1} height={1} />
        )
      })
    })
  })

  return (
    <svg
      viewBox={`0 0 ${COLS} ${H}`}
      height={snapped}
      width={(snapped * COLS) / H}
      role="img"
      aria-label={TEXT}
      shapeRendering="crispEdges"
      // currentColor, so the mark inherits whatever the bar or the page is
      // using and needs no colour prop.
      fill="currentColor"
      className={className}
    >
      {rects}
    </svg>
  )
}
