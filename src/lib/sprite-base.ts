/**
 * The 24x24 broker base, built rather than typed out.
 *
 * The old 16x16 grid was a literal array, and every edit risked a row of the
 * wrong width or a feature one pixel off the axis. This builds from spans and
 * paints each span together with its mirror, so symmetry is structural. The
 * tests assert it anyway, because the span helpers are also what the trait
 * layers use and a layer can still break the rule.
 *
 * 24 was chosen by the transaction budget, not by taste: a 24x24 indexed PNG
 * base64s to roughly 380 characters, which fits inside an SPL Memo alongside a
 * mint instruction. 32x32 does not.
 *
 * Glyphs
 *   .  transparent      o  outline        f  fur          d  fur shadow
 *   m  muzzle           e  sclera         p  pupil        n  nostril/mouth
 *   b  garment          c  garment accent
 */

export const SPRITE_SIZE = 24

export type Grid = string[][]

export function toGrid(rows: readonly string[]): Grid {
  return rows.map((r) => [...r])
}

export function fromGrid(g: Grid): string[] {
  return g.map((r) => r.join(""))
}

/** Paint [a..b] inclusive on row r. Out-of-range columns are ignored. */
export function put(g: Grid, r: number, a: number, b: number, ch: string): void {
  if (r < 0 || r >= SPRITE_SIZE) return
  for (let c = a; c <= b; c++) {
    if (c >= 0 && c < SPRITE_SIZE) g[r][c] = ch
  }
}

/** Paint a span and its mirror, so symmetry cannot drift. */
export function mirror(g: Grid, r: number, a: number, b: number, ch: string): void {
  put(g, r, a, b, ch)
  put(g, r, SPRITE_SIZE - 1 - b, SPRITE_SIZE - 1 - a, ch)
}

/** Fur run per row. The outline is painted one pixel outside each end. */
const HEAD: ReadonlyArray<readonly [number, number, number]> = [
  [2, 8, 15], [3, 6, 17], [4, 5, 18], [5, 5, 18], [6, 5, 18], [7, 5, 18],
  [8, 5, 18], [9, 5, 18], [10, 5, 18], [11, 5, 18], [12, 5, 18],
  [13, 6, 17], [14, 8, 15],
]

function build(): string[] {
  const g: Grid = Array.from({ length: SPRITE_SIZE }, () =>
    Array(SPRITE_SIZE).fill(".")
  )

  for (const [r, a, b] of HEAD) {
    put(g, r, a, b, "f")
    g[r][a - 1] = "o"
    g[r][b + 1] = "o"
  }
  mirror(g, 1, 8, 15, "o")            // crown
  mirror(g, 15, 9, 9, "o")            // jaw edge, left open at the neck

  // Ears: rounded lobes. Square corners read as headphone cups.
  mirror(g, 6, 2, 3, "f")
  for (const r of [7, 8, 9]) mirror(g, r, 1, 3, "f")
  mirror(g, 10, 2, 3, "f")
  mirror(g, 5, 2, 3, "o")
  mirror(g, 11, 2, 3, "o")
  mirror(g, 6, 1, 1, "o")
  mirror(g, 10, 1, 1, "o")
  for (const r of [7, 8, 9]) mirror(g, r, 0, 0, "o")
  mirror(g, 8, 3, 3, "d")
  mirror(g, 9, 3, 3, "d")

  // Crown shading and brow pads. A full-width brow bar reads as a visor.
  put(g, 2, 8, 15, "d")
  put(g, 3, 7, 16, "d")
  mirror(g, 7, 6, 9, "d")

  // Eyes: 4x2 sclera with a 2x2 pupil.
  mirror(g, 8, 6, 9, "e")
  mirror(g, 9, 6, 9, "e")
  mirror(g, 8, 7, 8, "p")
  mirror(g, 9, 7, 8, "p")

  // Muzzle.
  put(g, 10, 8, 15, "m")
  put(g, 11, 7, 16, "m")
  put(g, 12, 7, 16, "m")
  put(g, 13, 8, 15, "m")
  mirror(g, 11, 9, 9, "n")
  put(g, 12, 10, 13, "n")

  // Neck and shoulders.
  put(g, 15, 10, 13, "f")
  put(g, 16, 6, 17, "b"); g[16][5] = "o"; g[16][18] = "o"; put(g, 16, 10, 13, "f")
  put(g, 17, 4, 19, "b"); g[17][3] = "o"; g[17][20] = "o"; put(g, 17, 9, 14, "c")
  for (const r of [18, 19, 20, 21, 22, 23]) {
    put(g, r, 3, 20, "b"); g[r][2] = "o"; g[r][21] = "o"
  }

  return fromGrid(g)
}

export const BASE_ROWS: readonly string[] = build()
