/**
 * The logotype, drawn rather than typeset.
 *
 * It used to be set in Departure Mono, loaded from a woff2 that never once
 * decoded: the file was truncated by a single byte before it was first
 * committed, so every browser rejected it with an OTS parsing error and fell
 * back to Geist Mono. Drawing it as rects fixes that permanently — it cannot
 * fail to decode, costs no font request, and stays crisp at any size.
 *
 * PROPORTIONAL, not monospaced. The first version padded every glyph to a
 * fixed 5-column cell, which left "l" and "i" — both 1px stems — floating in
 * a 4px hole on either side while "a" and "n" sat shoulder to shoulder. The
 * word read as loose, unevenly spaced fragments. Each glyph now carries its
 * own width and every pair is separated by exactly GAP, so the rhythm is even
 * across the whole word.
 *
 * Vertical metrics, 8 rows: 0-1 ascender, 2-6 x-height, 7 descender. So "l",
 * "k", "b" and "t" rise and "p" drops, which is what stops a lowercase word
 * reading as a row of identical blocks.
 */

const H = 8

/** One blank column between letters, so stems never touch. */
const GAP = 1

/**
 * Glyphs, each as tall as H and as wide as it needs to be.
 *
 * Stems are 1px everywhere and bowls are 4 wide, so no letter looks heavier
 * than its neighbours.
 */
const GLYPHS: Record<string, string[]> = {
  p: ["....", "....", "###.", "#..#", "#..#", "#..#", "###.", "#..."],
  l: ["#.", "#.", "#.", "#.", "#.", "#.", "##", ".."],
  a: ["....", "....", "###.", "...#", "####", "#..#", ".###", "...."],
  n: ["....", "....", "###.", "#..#", "#..#", "#..#", "#..#", "...."],
  c: ["....", "....", ".###", "#...", "#...", "#...", ".###", "...."],
  k: ["#...", "#...", "#..#", "#.#.", "##..", "#.#.", "#..#", "...."],
  b: ["#...", "#...", "###.", "#..#", "#..#", "#..#", "###.", "...."],
  i: ["#", ".", "#", "#", "#", "#", "#", "."],
  t: ["#..", "#..", "###", "#..", "#..", "#..", ".##", "..."],
  s: ["....", "....", ".###", "#...", ".##.", "...#", "###.", "...."],
}

const TEXT = "planckbits"

/** Exported so tests can assert the glyphs stay well formed. */
export const WORDMARK_TEXT = TEXT
export const WORDMARK_GLYPHS = GLYPHS
export const WORDMARK_CELL = { H, GAP }

/** Width of a glyph, taken from the art itself rather than declared twice. */
function widthOf(ch: string): number {
  return GLYPHS[ch]?.[0]?.length ?? 0
}

const COLS =
  TEXT.split("").reduce((sum, ch) => sum + widthOf(ch), 0) + GAP * (TEXT.length - 1)

/**
 * Snap a requested height to a whole number of pixels per cell.
 *
 * The grid is H rows tall, so a height that is not a multiple of H puts cell
 * edges on fractions of a pixel and the browser antialiases them. At 18px the
 * nav wordmark was 2.25px per cell and rendered visibly softer than the hero,
 * which happened to land on 6px and 10px.
 *
 * Pixel art only scales by integers. Rounding here lets callers ask for any
 * height and still get a crisp mark, without knowing the grid.
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

  let x0 = 0
  for (const ch of TEXT) {
    const glyph = GLYPHS[ch]
    if (!glyph) continue

    glyph.forEach((row, y) => {
      row.split("").forEach((cell, x) => {
        if (cell !== "#") return
        rects.push(
          <rect key={`${x0}-${x}-${y}`} x={x0 + x} y={y} width={1} height={1} />
        )
      })
    })

    x0 += widthOf(ch) + GAP
  }

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
