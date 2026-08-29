# P1 — Chimp Roster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 16×16 human broker sprites with a 24×24 chimp system carrying occupation, scarcity tier, and assigned RWA instruments — sized so the rendered PNG fits inside a Solana transaction.

**Architecture:** Pure data + pure functions in `src/lib/`, with React only at the edge. The base grid is built from mirrored span definitions so symmetry is structural, not eyeballed. Trait layers own disjoint row bands and cap at two accessories. A `CompressionStream`-based PNG encoder proves the byte budget in tests today and is the same encoder P3 will call at mint time.

**Tech Stack:** TypeScript, React 19, Vitest + Testing Library, Vite. No new runtime dependencies.

## Global Constraints

- **Grid is 24×24.** `SPRITE_SIZE = 24`. Every row exactly 24 characters.
- **Every row is mirror-symmetric** except rows 12–14, the declared mouth band.
- **Layers own disjoint row bands.** Headwear 0–6. Eyewear 7–10. Mouth 12–14. Garment 16–23. A layer drawing outside its band is a bug.
- **At most two accessories** from {headwear, eyewear, mouth}. Enforced by a throw in `composeSprite`, not by convention.
- **Worst-case base64 ≤ 420 characters** across every trait combination. The SPL Memo ceiling is ~566 at default compute budget; 420 is the margin.
- **Palette ≤ 16 colours per sprite**, so the PNG stays indexed at 4bpp.
- **The tie carries the desk.** Unchanged rule from the existing codebase — desk colour appears on collar/tie, never as the only signal.
- **An absent number renders as `—`, never `$0`.** Existing rule, still applies.
- **Tier is cosmetic.** No code may make tier affect nerve, latency, coverage or effective nerve.
- Run tests with `npm test`. Typecheck with `npm run typecheck`.

---

### Task 1: The 24×24 base grid

**Files:**
- Create: `src/lib/sprite-base.ts`
- Test: `src/lib/sprite-base.test.ts`
- Delete at the end of Task 6: `src/lib/sprite-glyphs.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `SPRITE_SIZE: 24`, `BASE_ROWS: readonly string[]`, `type Grid = string[][]`, `toGrid(rows: readonly string[]): Grid`, `fromGrid(g: Grid): string[]`, `put(g: Grid, r: number, a: number, b: number, ch: string): void`, `mirror(g: Grid, r: number, a: number, b: number, ch: string): void`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sprite-base.test.ts
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
    expect(BASE_ROWS[8]).toContain("p")   // pupils
    expect(BASE_ROWS[12]).toContain("m")  // muzzle
    expect(BASE_ROWS[20]).toContain("b")  // body
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/sprite-base.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/sprite-base"`

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/sprite-base.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/sprite-base.test.ts`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/sprite-base.ts src/lib/sprite-base.test.ts
git commit -m "feat: 24x24 broker base, symmetric by construction"
```

---

### Task 2: Trait layers

**Files:**
- Create: `src/lib/sprite-layers.ts`
- Test: `src/lib/sprite-layers.test.ts`

**Interfaces:**
- Consumes: `Grid`, `SPRITE_SIZE`, `put`, `mirror`, `BASE_ROWS`, `toGrid`, `fromGrid` from `@/lib/sprite-base`
- Produces:
  - `type HeadwearId = "none" | "beanie" | "cap" | "visor" | "hardhat" | "fedora"`
  - `type EyewearId = "none" | "specs" | "shades" | "headset"`
  - `type MouthId = "none" | "pen" | "cigarette" | "cigar"`
  - `type GarmentId = "suit" | "hoodie" | "jacket" | "coveralls" | "shirtsleeves"`
  - `HEADWEAR: Record<HeadwearId, (g: Grid) => void>`
  - `EYEWEAR: Record<EyewearId, (g: Grid) => void>`
  - `MOUTH: Record<MouthId, (g: Grid) => void>`
  - `GARMENT: Record<GarmentId, (g: Grid) => void>`
  - `HEADWEAR_ROWS`, `EYEWEAR_ROWS`, `MOUTH_ROWS`, `GARMENT_ROWS` — each `readonly [number, number]`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sprite-layers.test.ts
import { describe, expect, it } from "vitest"

import { BASE_ROWS, fromGrid, toGrid } from "@/lib/sprite-base"
import {
  EYEWEAR, EYEWEAR_ROWS, GARMENT, GARMENT_ROWS,
  HEADWEAR, HEADWEAR_ROWS, MOUTH, MOUTH_ROWS,
} from "@/lib/sprite-layers"

/** Rows this layer actually changed, relative to the untouched base. */
function touchedRows(apply: (g: ReturnType<typeof toGrid>) => void): number[] {
  const g = toGrid(BASE_ROWS)
  apply(g)
  const after = fromGrid(g)
  const out: number[] = []
  after.forEach((row, i) => { if (row !== BASE_ROWS[i]) out.push(i) })
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
  it.each(CASES)("%s", (_name, table, [lo, hi]) => {
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
    const rows = fromGrid(g)
    const flipped = rows.some((row) => [...row].reverse().join("") !== row)
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/sprite-layers.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/sprite-layers"`

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/sprite-layers.ts
/**
 * Trait layers over the base.
 *
 * Two rules, both learned by breaking them.
 *
 * 1. LAYERS OWN DISJOINT ROW BANDS. The first pass let hat brims sit at the
 *    eye line, so every broker looked blindfolded and all five hats read as
 *    the same wide band. The bands below are asserted in the tests.
 * 2. ONE ASYMMETRIC LAYER. Only the mouth may break the axis, and only
 *    because a cigarette pointing at the viewer is an unreadable dot.
 *
 * Each hat is a different silhouette, not the same band in a different
 * colour. That is what makes the desk readable at roster size.
 */

import { mirror, put, type Grid } from "@/lib/sprite-base"

export const HEADWEAR_ROWS = [0, 6] as const
export const EYEWEAR_ROWS = [7, 10] as const
export const MOUTH_ROWS = [12, 14] as const
export const GARMENT_ROWS = [16, 23] as const

export type HeadwearId = "none" | "beanie" | "cap" | "visor" | "hardhat" | "fedora"
export type EyewearId = "none" | "specs" | "shades" | "headset"
export type MouthId = "none" | "pen" | "cigarette" | "cigar"
export type GarmentId = "suit" | "hoodie" | "jacket" | "coveralls" | "shirtsleeves"

/** H hat body · G hat band or brim. Rows 0-6 only. */
export const HEADWEAR: Record<HeadwearId, (g: Grid) => void> = {
  none: () => {},
  beanie: (g) => {
    put(g, 0, 9, 14, "o")
    put(g, 1, 8, 15, "H"); g[1][7] = "o"; g[1][16] = "o"
    put(g, 2, 7, 16, "H")
    put(g, 3, 6, 17, "H")
    put(g, 4, 5, 18, "G")
    put(g, 5, 5, 18, "G")
  },
  cap: (g) => {
    // Worn backwards: crown plus the strap gap. A forward brim would have to
    // cross the eye line, which the row band forbids.
    put(g, 1, 8, 15, "H")
    put(g, 2, 7, 16, "H")
    put(g, 3, 6, 17, "H")
    put(g, 4, 5, 18, "H")
    put(g, 5, 5, 18, "H")
    put(g, 5, 10, 13, "G")
  },
  visor: (g) => {
    put(g, 4, 5, 18, "H")
    put(g, 5, 4, 19, "G")
    put(g, 6, 5, 18, "G")
  },
  hardhat: (g) => {
    put(g, 0, 9, 14, "H")
    put(g, 1, 8, 15, "H")
    put(g, 2, 7, 16, "H")
    put(g, 3, 6, 17, "H")
    put(g, 4, 4, 19, "G")
  },
  fedora: (g) => {
    put(g, 1, 9, 14, "H")
    put(g, 2, 8, 15, "H")
    put(g, 3, 7, 16, "H")
    put(g, 4, 7, 16, "G")
    put(g, 5, 4, 19, "H")
  },
}

/** S frame · L lens. Rows 7-10 only. */
export const EYEWEAR: Record<EyewearId, (g: Grid) => void> = {
  none: () => {},
  specs: (g) => {
    // Frame only. Filled lenses turned spectacles into blackout goggles.
    mirror(g, 7, 4, 9, "S")
    mirror(g, 10, 5, 9, "S")
    mirror(g, 8, 4, 4, "S")
    mirror(g, 9, 4, 4, "S")
    put(g, 8, 10, 13, "S")
  },
  shades: (g) => {
    mirror(g, 8, 4, 9, "L")
    mirror(g, 9, 4, 9, "L")
    put(g, 7, 4, 19, "S")
    put(g, 8, 10, 13, "S")
  },
  headset: (g) => {
    mirror(g, 7, 1, 3, "S")
    mirror(g, 8, 1, 3, "S")
    mirror(g, 9, 1, 3, "S")
    mirror(g, 8, 2, 2, "L")
    mirror(g, 9, 2, 2, "L")
  },
}

/** K stick · R ember. Rows 12-14. The one asymmetric layer. */
export const MOUTH: Record<MouthId, (g: Grid) => void> = {
  none: () => {},
  pen: (g) => {
    put(g, 12, 14, 18, "K")
    put(g, 12, 19, 19, "T")
  },
  cigarette: (g) => {
    put(g, 13, 14, 20, "K")
    put(g, 13, 21, 21, "R")
  },
  cigar: (g) => {
    put(g, 12, 14, 19, "K")
    put(g, 13, 14, 19, "K")
    put(g, 12, 20, 20, "R")
    put(g, 13, 20, 20, "R")
  },
}

/** b body · c accent · T desk colour. Rows 16-23 only. */
export const GARMENT: Record<GarmentId, (g: Grid) => void> = {
  suit: (g) => {
    put(g, 17, 9, 14, "c")
    put(g, 18, 10, 13, "c")
    for (const r of [18, 19, 20, 21, 22, 23]) put(g, r, 11, 12, "T")
  },
  hoodie: (g) => {
    put(g, 16, 6, 17, "c"); put(g, 16, 10, 13, "f")
    put(g, 17, 4, 19, "c"); put(g, 17, 9, 14, "f")
    for (const r of [19, 20]) { put(g, r, 9, 9, "T"); put(g, r, 14, 14, "T") }
  },
  jacket: (g) => {
    put(g, 17, 9, 14, "c")
    for (const r of [18, 20, 22]) put(g, r, 3, 20, "c")
    put(g, 19, 11, 12, "T")
    put(g, 21, 11, 12, "T")
  },
  coveralls: (g) => {
    put(g, 17, 9, 14, "c")
    for (const r of [18, 19, 20, 21, 22, 23]) {
      put(g, r, 7, 8, "c"); put(g, r, 15, 16, "c")
    }
    put(g, 20, 9, 14, "T")
  },
  shirtsleeves: (g) => {
    put(g, 17, 8, 15, "c")
    put(g, 18, 9, 14, "c")
    for (const r of [19, 20, 21, 22, 23]) put(g, r, 11, 12, "T")
    put(g, 20, 3, 5, "T")
    put(g, 20, 18, 20, "T")
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/sprite-layers.test.ts`
Expected: PASS. If a band assertion fails, move the offending `put` inside the band — never widen the band.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sprite-layers.ts src/lib/sprite-layers.test.ts
git commit -m "feat: trait layers with disjoint row bands"
```

---

### Task 3: Scarcity tiers

**Files:**
- Create: `src/lib/sprite-tiers.ts`
- Test: `src/lib/sprite-tiers.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type TierId = "common" | "uncommon" | "rare" | "epic" | "legendary"`
  - `type Tier = { id: TierId; label: string; odds: number; dark: boolean; muzzle: string; grounds: readonly string[]; furs: readonly (readonly [string, string])[] }`
  - `TIERS: readonly Tier[]`
  - `tierById(id: TierId): Tier`
  - `rollTier(rand: () => number): TierId`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sprite-tiers.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/sprite-tiers.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/sprite-tiers"`

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/sprite-tiers.ts
/**
 * Scarcity tiers.
 *
 * Fur is the signal. Naturals at the common end, colours no chimp has at the
 * rare end — that is the whole read, and it works at thumbnail size where a
 * stat bar does not.
 *
 * Tier is COSMETIC. It is rolled and stored so it is verifiable rather than
 * authored, but nothing may make it affect nerve, latency, coverage or
 * effective nerve. The site copy must not imply otherwise.
 */

export type TierId = "common" | "uncommon" | "rare" | "epic" | "legendary"

export type Tier = {
  id: TierId
  label: string
  /** Probability in 0..1. The table must sum to exactly 1. */
  odds: number
  /** Dark ground and outline, so non-natural fur does not wash out. */
  dark: boolean
  muzzle: string
  grounds: readonly string[]
  /** [fur, shadow] pairs. */
  furs: readonly (readonly [string, string])[]
}

export const TIERS: readonly Tier[] = [
  {
    id: "common", label: "COMMON", odds: 0.62, dark: false, muzzle: "#d9bb95",
    grounds: ["#c9d9c4", "#dfd6c2", "#d6ccc0"],
    furs: [["#7a5537", "#4a3728"], ["#6b4a2a", "#42301c"], ["#8c6239", "#5c4330"]],
  },
  {
    id: "uncommon", label: "UNCOMMON", odds: 0.25, dark: false, muzzle: "#cfb99b",
    grounds: ["#f0d9c0", "#e8dcc4", "#dde6c4"],
    furs: [["#2f2a26", "#1a1714"], ["#b09070", "#836a52"], ["#6e6a63", "#494540"]],
  },
  {
    id: "rare", label: "RARE", odds: 0.09, dark: false, muzzle: "#c9c0b4",
    grounds: ["#e8c9d6", "#cfc6e8", "#c6dbe8"],
    furs: [["#5c6b7a", "#3a4652"], ["#6b7a5c", "#455239"], ["#7a5c6b", "#523a46"]],
  },
  {
    id: "epic", label: "EPIC", odds: 0.035, dark: true, muzzle: "#eaf6f8",
    grounds: ["#101418", "#18101c", "#0e1a18"],
    furs: [["#17c3d4", "#0d7d88"], ["#d417a8", "#8a0d6c"], ["#7fd417", "#4d8a0d"]],
  },
  {
    id: "legendary", label: "LEGENDARY", odds: 0.005, dark: true, muzzle: "#ffffff",
    grounds: ["#000000", "#0a0a12", "#120a00"],
    furs: [["#e8f4f8", "#9db4c0"], ["#c8a2ff", "#7a5cb0"], ["#ffd700", "#b08d00"]],
  },
]

const BY_ID = new Map(TIERS.map((t) => [t.id, t]))

export function tierById(id: TierId): Tier {
  const t = BY_ID.get(id)
  if (!t) throw new Error(`unknown tier: ${id}`)
  return t
}

/**
 * Roll a tier. Walks the table accumulating odds, so the distribution is
 * exactly the declared one and the last tier absorbs any float residue.
 */
export function rollTier(rand: () => number): TierId {
  let n = rand()
  for (const t of TIERS) {
    n -= t.odds
    if (n < 0) return t.id
  }
  return TIERS[TIERS.length - 1].id
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/sprite-tiers.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/sprite-tiers.ts src/lib/sprite-tiers.test.ts
git commit -m "feat: five scarcity tiers, fur as the signal"
```

---

### Task 4: Tier trait and instrument assignment

**Files:**
- Modify: `src/lib/brokers.ts`
- Modify: `src/lib/instruments.ts`
- Test: `src/lib/brokers.test.ts` (existing — add cases)
- Test: `src/lib/instruments.test.ts` (existing — add cases)

**Interfaces:**
- Consumes: `TierId`, `rollTier` from `@/lib/sprite-tiers`; `Instrument`, `instrumentsForDesk` from `@/lib/instruments`
- Produces:
  - `BrokerTraits` gains `tier: TierId`
  - `instrumentsForBroker(b: Broker): Instrument[]` in `instruments.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// append to src/lib/instruments.test.ts
import { instrumentsForBroker } from "@/lib/instruments"
import type { Broker } from "@/lib/brokers"

const BROKER: Broker = {
  id: "PB-001", name: "MARL FARRAR", desk: "equities", tier: "common",
  nerve: 50, latency: 50, coverage: 3, effectiveNerve: 50, tenureHours: 0,
}

describe("instrumentsForBroker", () => {
  it("assigns exactly coverage instruments when the desk is deep enough", () => {
    expect(instrumentsForBroker(BROKER)).toHaveLength(3)
  })

  it("caps at the desk size — a YIELD broker cannot cover nine of one thing", () => {
    // This is the coverage-overflow rule made visible. Surplus already
    // converts to nerve; the card must not claim instruments that do not exist.
    const clerk = { ...BROKER, desk: "yield" as const, coverage: 9 }
    expect(instrumentsForBroker(clerk)).toHaveLength(1)
  })

  it("only ever assigns instruments from the broker's own desk", () => {
    for (const desk of ["equities", "index", "bullion", "yield", "credit"] as const) {
      const b = { ...BROKER, desk, coverage: 9 }
      for (const inst of instrumentsForBroker(b)) {
        expect(inst.desk, `${desk} got ${inst.symbol}`).toBe(desk)
      }
    }
  })

  it("is deterministic for the same broker", () => {
    const a = instrumentsForBroker(BROKER).map((i) => i.mint)
    const b = instrumentsForBroker(BROKER).map((i) => i.mint)
    expect(a).toEqual(b)
  })

  it("gives different brokers different books", () => {
    const a = instrumentsForBroker(BROKER).map((i) => i.mint).join()
    const b = instrumentsForBroker({ ...BROKER, id: "PB-019" }).map((i) => i.mint).join()
    expect(a).not.toBe(b)
  })

  it("never repeats an instrument within one broker", () => {
    const mints = instrumentsForBroker({ ...BROKER, coverage: 7 }).map((i) => i.mint)
    expect(new Set(mints).size).toBe(mints.length)
  })
})
```

```ts
// append to src/lib/brokers.test.ts
import { ROSTER } from "@/lib/brokers"
import { TIERS } from "@/lib/sprite-tiers"

describe("roster tiers", () => {
  it("gives every broker a valid tier", () => {
    const ids = new Set(TIERS.map((t) => t.id))
    for (const b of ROSTER) expect(ids.has(b.tier), `${b.id} tier ${b.tier}`).toBe(true)
  })

  it("does not let tier touch the stats", () => {
    // Tier is cosmetic. If it ever correlates with nerve, the site is lying.
    for (const b of ROSTER) {
      expect(b.effectiveNerve).toBeGreaterThanOrEqual(b.nerve)
      expect(b.effectiveNerve).toBeLessThanOrEqual(100)
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/instruments.test.ts src/lib/brokers.test.ts`
Expected: FAIL — `instrumentsForBroker is not exported`, and a type error on `tier`

- [ ] **Step 3: Write the implementation**

In `src/lib/instruments.ts`, append:

```ts
import type { Broker } from "@/lib/brokers"

/**
 * The instruments a broker actually carries.
 *
 * This is COVERAGE made concrete. The trait was an abstract number for a
 * while, and the card showed "coverage 5" with nothing behind it. A broker
 * holds min(coverage, deskSize) instruments off his own desk, so the surplus
 * that converts to nerve is visibly the surplus rather than a silent rule.
 *
 * Deterministic from the broker id: the same broker always carries the same
 * book, on the site and in the social image.
 */
export function instrumentsForBroker(b: Broker): Instrument[] {
  const pool = instrumentsForDesk(b.desk)
  const want = Math.min(Math.max(1, b.coverage), pool.length)

  // FNV-1a over the id, then a rotation. Slicing from a hashed offset keeps
  // the book stable and gives different brokers different starting points.
  let h = 2166136261
  for (let i = 0; i < b.id.length; i++) {
    h ^= b.id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const start = Math.abs(h) % pool.length

  const out: Instrument[] = []
  for (let i = 0; i < want; i++) out.push(pool[(start + i) % pool.length])
  return out
}
```

In `src/lib/brokers.ts`:

```ts
// add to the imports
import { rollTier, type TierId } from "@/lib/sprite-tiers"

// BrokerTraits gains one field:
export type BrokerTraits = {
  desk: DeskId
  /** Position size as a percent of the vault's per-engagement allocation. */
  nerve: number
  /** Slots between hire and deployment. Lower is better. */
  latency: number
  /** Instruments held simultaneously. Surplus converts to nerve. */
  coverage: number
  /**
   * Scarcity band. COSMETIC — it drives fur, ground and garment palette and
   * nothing else. effectiveNerve must never read it.
   */
  tier: TierId
}
```

Then in `rollBroker`, add `tier: rollTier(rand)` to the `traits` object, and in `buildRoster`'s trait literal add `tier: rollTier(rand)`. In the `MIN_PER_DESK` rebalancing block, carry `tier: v.tier` through so a moved broker keeps its tier.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/instruments.test.ts src/lib/brokers.test.ts && npm run typecheck`
Expected: PASS. Typecheck will surface every other construction site of `Broker` — fix each by adding a tier.

- [ ] **Step 5: Commit**

```bash
git add src/lib/brokers.ts src/lib/instruments.ts src/lib/brokers.test.ts src/lib/instruments.test.ts
git commit -m "feat: tier trait and per-broker instrument books"
```

---

### Task 5: Composition

**Files:**
- Modify: `src/lib/sprite-compose.ts` (full rewrite)
- Test: `src/lib/sprite-compose.test.ts` (create)

**Interfaces:**
- Consumes: everything from Tasks 1–4
- Produces:
  - `brokerLayers(b: Broker): { headwear: HeadwearId; eyewear: EyewearId; mouth: MouthId; garment: GarmentId }`
  - `composeSprite(b: Broker): string[]`
  - `spritePalette(b: Broker): Record<string, string>`
  - `spriteGround(b: Broker): string`
  - `DESK_COLOR: Record<DeskId, string>` (unchanged export, keep for the social script)
  - `MAX_ACCESSORIES = 2`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sprite-compose.test.ts
import { describe, expect, it } from "vitest"

import type { Broker } from "@/lib/brokers"
import { ROSTER } from "@/lib/brokers"
import { brokerLayers, composeSprite, spriteGround, spritePalette } from "@/lib/sprite-compose"

const B: Broker = {
  id: "PB-001", name: "MARL FARRAR", desk: "credit", tier: "common",
  nerve: 50, latency: 50, coverage: 3, effectiveNerve: 50, tenureHours: 0,
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

  it("changes the ground with the tier", () => {
    const common = spriteGround({ ...B, tier: "common" })
    const legendary = spriteGround({ ...B, tier: "legendary" })
    expect(common).not.toBe(legendary)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/sprite-compose.test.ts`
Expected: FAIL — `brokerLayers is not exported`

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/sprite-compose.ts — full replacement
/**
 * Broker portrait composition, without React.
 *
 * Split from the component so the social-image generator renders the exact
 * art the site renders. Duplicating palettes into a script would drift the
 * day a threshold moves, and the profile picture would quietly stop matching
 * the roster.
 */

import type { Broker } from "@/lib/brokers"
import type { DeskId } from "@/lib/instruments"
import { BASE_ROWS, fromGrid, toGrid } from "@/lib/sprite-base"
import {
  EYEWEAR, GARMENT, HEADWEAR, MOUTH,
  type EyewearId, type GarmentId, type HeadwearId, type MouthId,
} from "@/lib/sprite-layers"
import { tierById } from "@/lib/sprite-tiers"

/** The tie carries the desk. It is the one colour that means something. */
export const DESK_COLOR: Record<DeskId, string> = {
  equities: "#2148E2",
  index: "#1B7F4B",
  bullion: "#B8860B",
  yield: "#6B6459",
  credit: "#C4362B",
}

/** The occupation behind each desk, read off the instruments it carries. */
const DESK_GARMENT: Record<DeskId, GarmentId> = {
  equities: "hoodie",        // tech analyst
  index: "jacket",           // floor trader
  bullion: "coveralls",      // vault keeper
  yield: "shirtsleeves",     // treasury clerk
  credit: "suit",            // underwriter
}

const DESK_HAT: Record<DeskId, HeadwearId> = {
  equities: "beanie",
  index: "cap",
  bullion: "hardhat",
  yield: "visor",
  credit: "fedora",
}

/** A third accessory erases the face at 24px. */
export const MAX_ACCESSORIES = 2

const HAT_AT = 60
const HEADSET_AT = 30
const SHADES_AT = 80

export function spriteHash(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * Which accessories a broker wears.
 *
 * Each stat proposes one. If all three propose, the least extreme stat loses
 * — the portrait shows what is remarkable about him, not an inventory.
 */
export function brokerLayers(b: Broker): {
  headwear: HeadwearId
  eyewear: EyewearId
  mouth: MouthId
  garment: GarmentId
} {
  let headwear: HeadwearId = b.effectiveNerve >= HAT_AT ? DESK_HAT[b.desk] : "none"
  let eyewear: EyewearId =
    b.latency <= HEADSET_AT ? "headset" : b.latency >= SHADES_AT ? "shades" : "none"
  let mouth: MouthId =
    b.coverage >= 7 ? "cigar" : b.coverage >= 4 ? "cigarette" : b.coverage >= 2 ? "pen" : "none"

  const worn = [headwear, eyewear, mouth].filter((x) => x !== "none").length
  if (worn > MAX_ACCESSORIES) {
    // Distance from the middle of each stat's range, normalised to 0..100.
    const strength = {
      headwear: b.effectiveNerve,
      eyewear: Math.abs(b.latency - 50) * 2,
      mouth: (b.coverage / 9) * 100,
    }
    const weakest = (["mouth", "eyewear", "headwear"] as const).reduce((a, k) =>
      strength[k] < strength[a] ? k : a
    )
    if (weakest === "headwear") headwear = "none"
    else if (weakest === "eyewear") eyewear = "none"
    else mouth = "none"
  }

  return { headwear, eyewear, mouth, garment: DESK_GARMENT[b.desk] }
}

/** Traits that change the silhouette, so the grid is scannable. */
export function composeSprite(b: Broker): string[] {
  const { headwear, eyewear, mouth, garment } = brokerLayers(b)

  const worn = [headwear, eyewear, mouth].filter((x) => x !== "none")
  if (worn.length > MAX_ACCESSORIES) {
    throw new Error(`${b.id} wears ${worn.join(", ")} — the face is gone`)
  }

  const g = toGrid(BASE_ROWS)
  GARMENT[garment](g)
  EYEWEAR[eyewear](g)
  HEADWEAR[headwear](g)
  MOUTH[mouth](g)
  return fromGrid(g)
}

/** The flat ground behind the portrait. Carries the tier. */
export function spriteGround(b: Broker): string {
  const tier = tierById(b.tier)
  return tier.grounds[spriteHash(b.id) % tier.grounds.length]
}

/** Glyph character to colour, for one broker. */
export function spritePalette(b: Broker): Record<string, string> {
  const tier = tierById(b.tier)
  const h = spriteHash(b.id)
  const [fur, shadow] = tier.furs[(h >> 3) % tier.furs.length]
  const desk = DESK_COLOR[b.desk]

  return {
    o: tier.dark ? "#05070a" : "#14120f",
    f: fur,
    d: shadow,
    m: tier.muzzle,
    e: "#fdfaf3",
    p: "#14120f",
    n: shadow,
    b: tier.dark ? "#1c2029" : "#3b2a1d",
    c: tier.dark ? "#e8f4f8" : "#fdfaf3",
    T: desk,
    H: tier.dark ? "#2a3038" : "#4a3728",
    G: desk,
    S: "#14120f",
    L: tier.dark ? "#0b3a42" : "#241f1b",
    K: "#f4f1ea",
    R: "#ff5b1a",
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/sprite-compose.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/sprite-compose.ts src/lib/sprite-compose.test.ts
git commit -m "feat: compose chimps from tier, desk and stats"
```

---

### Task 6: Render at 24×24

**Files:**
- Modify: `src/components/broker-sprite.tsx`
- Modify: `src/components/broker-sprite.test.tsx`
- Delete: `src/lib/sprite-glyphs.ts`

**Interfaces:**
- Consumes: `composeSprite`, `spritePalette`, `spriteGround`
- Produces: `<BrokerSprite broker size />` rendering a `0 0 24 24` viewBox

- [ ] **Step 1: Update the test**

Replace `src/components/broker-sprite.test.tsx` entirely. The old grid tests move to `sprite-base.test.ts` (Task 1), so this file now only covers the component.

```tsx
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BrokerSprite } from "@/components/broker-sprite"
import type { Broker } from "@/lib/brokers"

const BROKER: Broker = {
  id: "PB-001", name: "MILO ASH", desk: "equities", tier: "common",
  nerve: 40, latency: 90, coverage: 2, effectiveNerve: 40, tenureHours: 100,
}

describe("BrokerSprite", () => {
  it("renders an svg labelled with the broker name", () => {
    const { container } = render(<BrokerSprite broker={BROKER} />)
    const svg = container.querySelector("svg")
    expect(svg?.getAttribute("aria-label")).toContain("MILO ASH")
  })

  it("uses a 24-unit viewBox so pixels stay square", () => {
    const { container } = render(<BrokerSprite broker={BROKER} />)
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 24 24")
  })

  it("paints a ground, so the portrait is never transparent", () => {
    const { container } = render(<BrokerSprite broker={BROKER} />)
    const first = container.querySelector("svg rect")
    expect(first?.getAttribute("width")).toBe("24")
  })

  it("is deterministic — the same broker yields identical markup", () => {
    const a = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const b = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    expect(a).toBe(b)
  })

  it("differs between desks, so the outfit reads the desk", () => {
    const a = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const b = render(<BrokerSprite broker={{ ...BROKER, desk: "bullion" }} />)
      .container.innerHTML
    expect(a).not.toBe(b)
  })

  it("differs between tiers, so scarcity reads at a glance", () => {
    const a = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const b = render(<BrokerSprite broker={{ ...BROKER, tier: "legendary" }} />)
      .container.innerHTML
    expect(a).not.toBe(b)
  })

  it("gives different brokers different faces", () => {
    const a = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const b = render(<BrokerSprite broker={{ ...BROKER, id: "PB-017" }} />)
      .container.innerHTML
    expect(a).not.toBe(b)
  })

  it("adds a hat for high nerve", () => {
    const plain = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const hatted = render(<BrokerSprite broker={{ ...BROKER, effectiveNerve: 85 }} />)
      .container.innerHTML
    expect(hatted).not.toBe(plain)
  })

  it("adds a headset for low latency", () => {
    const plain = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const wired = render(<BrokerSprite broker={{ ...BROKER, latency: 10 }} />)
      .container.innerHTML
    expect(wired).not.toBe(plain)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/broker-sprite.test.tsx`
Expected: FAIL on the viewBox and ground assertions

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/broker-sprite.tsx
import type { Broker } from "@/lib/brokers"
import { composeSprite, spriteGround, spritePalette } from "@/lib/sprite-compose"
import { SPRITE_SIZE } from "@/lib/sprite-base"

/**
 * A broker portrait, composed rather than drawn.
 *
 * The roster is generative and the program will read it from chain, so
 * hand-drawn bitmaps would not survive. This is a 24x24 grid of rects — real
 * pixel art, every pixel placed by trait — and it stays crisp at any scale
 * because it is vector underneath.
 *
 * It was 16x16 and read as a person in a suit. 24 is what buys a chimp with
 * a beanie, a headset or a cigarette as distinguishable shapes: 576 pixels
 * against 256. The ceiling is the Solana transaction, not the layout — a
 * 24x24 indexed PNG base64s small enough to ride inside the mint.
 *
 * The composition lives in lib/sprite-compose.ts, with no React, so the
 * social-image generator renders the same art rather than a copy of it.
 */
export function BrokerSprite({ broker, size = 96 }: { broker: Broker; size?: number }) {
  const rows = composeSprite(broker)
  const palette = spritePalette(broker)
  const ground = spriteGround(broker)

  return (
    <svg
      viewBox={`0 0 ${SPRITE_SIZE} ${SPRITE_SIZE}`}
      width={size}
      height={size}
      role="img"
      aria-label={`${broker.name}, ${broker.desk} desk, ${broker.tier}`}
      shapeRendering="crispEdges"
      className="pixel shrink-0"
    >
      {/* The ground is part of the art: it carries the tier, and a
          transparent portrait would take the panel colour behind it. */}
      <rect x={0} y={0} width={SPRITE_SIZE} height={SPRITE_SIZE} fill={ground} />
      {rows.map((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[c]} />
          ),
        ),
      )}
    </svg>
  )
}
```

- [ ] **Step 4: Run the whole suite**

Run: `npm test && npm run typecheck`
Expected: PASS. `scripts/make-social.mjs` and `make-og.mjs` import from `sprite-compose`; if they reference `SPRITE_ROWS` or `SPRITE_HAT`, repoint them at `BASE_ROWS` and add a `tier` to any hardcoded broker literal.

- [ ] **Step 5: Delete the dead module and commit**

```bash
git rm src/lib/sprite-glyphs.ts
git add -A
git commit -m "feat: render brokers at 24x24 with a tier ground"
```

---

### Task 7: PNG encoder and the byte budget

**Files:**
- Create: `src/lib/sprite-png.ts`
- Test: `src/lib/sprite-png.test.ts`

**Interfaces:**
- Consumes: `composeSprite`, `spritePalette`, `spriteGround`
- Produces:
  - `encodePng(rows: readonly string[], palette: Record<string, string>, ground: string): Promise<Uint8Array>`
  - `spritePngBase64(b: Broker): Promise<string>`
  - `MEMO_BUDGET = 420`

This is the task the whole 24×24 decision rests on. `CompressionStream("deflate")` produces zlib-wrapped deflate, which is exactly what a PNG `IDAT` needs, and it exists in browsers and Node 18+ — so the same encoder runs in this test today and in the mint transaction at P3.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sprite-png.test.ts
import { describe, expect, it } from "vitest"

import { ROSTER } from "@/lib/brokers"
import type { Broker } from "@/lib/brokers"
import { TIERS } from "@/lib/sprite-tiers"
import { MEMO_BUDGET, spritePngBase64 } from "@/lib/sprite-png"

const BASE: Broker = {
  id: "PB-001", name: "MARL FARRAR", desk: "credit", tier: "common",
  nerve: 50, latency: 50, coverage: 3, effectiveNerve: 50, tenureHours: 0,
}

describe("sprite PNG", () => {
  it("starts with the PNG signature", async () => {
    const b64 = await spritePngBase64(BASE)
    expect(b64.startsWith("iVBORw0KGgo")).toBe(true)
  })

  it("fits the memo budget for every broker on the floor", async () => {
    for (const b of ROSTER) {
      const b64 = await spritePngBase64(b)
      expect(b64.length, `${b.id} is ${b64.length} chars`).toBeLessThanOrEqual(MEMO_BUDGET)
    }
  })

  it("fits the memo budget across EVERY trait combination", async () => {
    // This is the assertion the 24x24 decision rests on. A rare roll that
    // produced an oversized PNG would be an unmintable broker — a mint that
    // takes the fee and fails. Exhaustive, not sampled.
    let worst = 0
    let worstLabel = ""
    for (const tier of TIERS) {
      for (const desk of ["equities", "index", "bullion", "yield", "credit"] as const) {
        for (const nerve of [10, 65, 100]) {
          for (const latency of [10, 50, 95]) {
            for (const coverage of [1, 3, 5, 9]) {
              const b: Broker = {
                ...BASE, desk, tier: tier.id, nerve, latency, coverage,
                effectiveNerve: nerve,
              }
              const b64 = await spritePngBase64(b)
              if (b64.length > worst) {
                worst = b64.length
                worstLabel = `${tier.id}/${desk}/n${nerve}/l${latency}/c${coverage}`
              }
            }
          }
        }
      }
    }
    expect(worst, `worst case ${worstLabel} at ${worst} chars`).toBeLessThanOrEqual(MEMO_BUDGET)
  })

  it("is deterministic — the hash stored on chain must be stable", async () => {
    expect(await spritePngBase64(BASE)).toBe(await spritePngBase64(BASE))
  })

  it("differs between brokers", async () => {
    const a = await spritePngBase64(BASE)
    const b = await spritePngBase64({ ...BASE, tier: "legendary", id: "PB-009" })
    expect(a).not.toBe(b)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/sprite-png.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/sprite-png"`

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/sprite-png.ts
/**
 * The broker portrait as an indexed PNG.
 *
 * This exists because of Solana, not because of the browser. The mint
 * transaction carries the rendered portrait as base64 in an SPL Memo, and the
 * program hashes it — so the image has to fit, and the encoding has to be
 * byte-identical everywhere or the hash stops matching.
 *
 * Budget: a transaction is capped at 1232 bytes, and an unsigned memo at
 * roughly 566 characters of single-byte UTF-8 at the default compute budget.
 * MEMO_BUDGET is 420, which leaves real margin under that ceiling.
 *
 * 4-bit indexed with a palette, deflated through CompressionStream — which is
 * zlib-wrapped, exactly what IDAT wants, and present in browsers and Node 18+.
 * No dependency, and the same bytes on both sides.
 */

import type { Broker } from "@/lib/brokers"
import { SPRITE_SIZE } from "@/lib/sprite-base"
import { composeSprite, spriteGround, spritePalette } from "@/lib/sprite-compose"

/** Maximum base64 length. Below the ~566 SPL Memo ceiling, with margin. */
export const MEMO_BUDGET = 420

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  const body = out.subarray(4, 8 + data.length)
  view.setUint32(8 + data.length, crc32(body))
  return out
}

async function deflate(raw: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate")
  const writer = cs.writable.getWriter()
  void writer.write(raw)
  void writer.close()
  const buf = await new Response(cs.readable).arrayBuffer()
  return new Uint8Array(buf)
}

function rgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

export async function encodePng(
  rows: readonly string[],
  palette: Record<string, string>,
  ground: string
): Promise<Uint8Array> {
  // Index the colours in first-seen order. "." takes the ground.
  const index = new Map<string, number>()
  const table: string[] = []
  const colourOf = (ch: string) => (ch === "." ? ground : palette[ch])
  for (const row of rows) {
    for (const ch of row) {
      const hex = colourOf(ch)
      if (!index.has(hex)) {
        index.set(hex, table.length)
        table.push(hex)
      }
    }
  }
  if (table.length > 16) {
    throw new Error(`${table.length} colours — 4-bit indexed PNG holds 16`)
  }

  // 4bpp: two pixels per byte, one filter byte (0 = None) per scanline.
  const stride = SPRITE_SIZE / 2
  const raw = new Uint8Array(SPRITE_SIZE * (stride + 1))
  let p = 0
  for (let y = 0; y < SPRITE_SIZE; y++) {
    raw[p++] = 0
    for (let x = 0; x < SPRITE_SIZE; x += 2) {
      const hi = index.get(colourOf(rows[y][x]))!
      const lo = index.get(colourOf(rows[y][x + 1]))!
      raw[p++] = (hi << 4) | lo
    }
  }

  const ihdr = new Uint8Array(13)
  const hv = new DataView(ihdr.buffer)
  hv.setUint32(0, SPRITE_SIZE)
  hv.setUint32(4, SPRITE_SIZE)
  ihdr[8] = 4    // bit depth
  ihdr[9] = 3    // colour type: indexed
  // 10..12 stay 0: deflate, adaptive filtering, no interlace

  const plte = new Uint8Array(table.length * 3)
  table.forEach((hex, i) => {
    const [r, g, b] = rgb(hex)
    plte[i * 3] = r
    plte[i * 3 + 1] = g
    plte[i * 3 + 2] = b
  })

  const idat = await deflate(raw)
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("PLTE", plte),
    chunk("IDAT", idat),
    chunk("IEND", new Uint8Array(0)),
  ]

  const total = parts.reduce((a, c) => a + c.length, 0)
  const png = new Uint8Array(total)
  let o = 0
  for (const part of parts) {
    png.set(part, o)
    o += part.length
  }
  return png
}

function toBase64(bytes: Uint8Array): string {
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  // btoa exists in browsers and in Node 16+.
  return btoa(s)
}

/** The portrait as base64, exactly as it goes into the memo. */
export async function spritePngBase64(b: Broker): Promise<string> {
  const png = await encodePng(composeSprite(b), spritePalette(b), spriteGround(b))
  return toBase64(png)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/sprite-png.test.ts`
Expected: PASS. The exhaustive case prints the worst combination if it fails.

**If the worst case exceeds 420:** do not raise `MEMO_BUDGET`. Reduce the palette instead — collapse `n` onto `d`, or `H` onto `b` — because the ceiling is the SPL Memo's, not ours.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sprite-png.ts src/lib/sprite-png.test.ts
git commit -m "feat: indexed PNG encoder, proving the memo budget"
```

---

### Task 8: Re-seed the roster

**Files:**
- Create: `scripts/dump-roster.mjs`
- Create: `supabase/migrations/0004_broker_tier.sql`
- Modify: `src/lib/roster-source.ts`
- Test: `src/lib/roster-source.test.ts` (create)

**Interfaces:**
- Consumes: `ROSTER`, `rowToBroker`, `TierId`
- Produces: `BrokerRow` gains `tier: TierId | null`; `rowToBroker` falls back to `"common"`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/roster-source.test.ts
import { describe, expect, it } from "vitest"

import { rowToBroker } from "@/lib/roster-source"

const ROW = {
  id: "PB-001", name: "MARL FARRAR", desk: "credit" as const,
  nerve: 81, latency: 73, coverage: 5, effective_nerve: 85,
  tenure_hours: 3955, tier: "epic" as const,
}

describe("rowToBroker", () => {
  it("carries the tier through", () => {
    expect(rowToBroker(ROW)?.tier).toBe("epic")
  })

  it("falls back to common when the column is null", () => {
    // Rows written before 0004 have no tier. They must still render rather
    // than vanish from the floor.
    expect(rowToBroker({ ...ROW, tier: null })?.tier).toBe("common")
  })

  it("falls back to common on an unrecognised tier", () => {
    expect(rowToBroker({ ...ROW, tier: "mythic" as never })?.tier).toBe("common")
  })

  it("still drops a malformed row", () => {
    expect(rowToBroker({ ...ROW, desk: "options" as never })).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/roster-source.test.ts`
Expected: FAIL — `tier` is not on the returned broker

- [ ] **Step 3: Write the implementation**

In `src/lib/roster-source.ts`:

```ts
import { TIERS, type TierId } from "@/lib/sprite-tiers"

// BrokerRow gains one column:
//   tier: TierId | null

const TIER_IDS = new Set<string>(TIERS.map((t) => t.id))

// inside rowToBroker, before the return:
const tier: TierId =
  typeof row.tier === "string" && TIER_IDS.has(row.tier) ? (row.tier as TierId) : "common"

// and add `tier` to both the traits object and the returned broker.
```

Create `scripts/dump-roster.mjs`, which prints the seed SQL from the fixture so the two can never disagree:

```js
/**
 * Print the seed SQL for the current fixture roster.
 *
 * The fixture is deterministic, so the database seed is derivable from it.
 * Hand-maintaining both is how they drift, and a drifted seed empties the
 * floor the day VITE_SUPABASE_URL is set.
 *
 * Usage: node scripts/dump-roster.mjs > supabase/migrations/0004_broker_tier.sql
 */
import { ROSTER } from "../src/lib/brokers.ts"

const q = (s) => `'${String(s).replace(/'/g, "''")}'`

console.log(`-- APEBITS — tier column and the chimp roster.
--
-- Generated by scripts/dump-roster.mjs. Do not hand-edit: regenerate it.
--
-- tier is nullable so this migration is safe to apply before any code reads
-- it, and rowToBroker falls back to 'common' for rows written earlier.

create type tier_id as enum ('common', 'uncommon', 'rare', 'epic', 'legendary');

alter table brokers add column if not exists tier tier_id;
`)

for (const b of ROSTER) {
  console.log(
    `update brokers set tier = ${q(b.tier)} where id = ${q(b.id)};`
  )
}
```

Add to `package.json` scripts: `"roster": "node --experimental-strip-types scripts/dump-roster.mjs"`.

- [ ] **Step 4: Generate the migration and run everything**

```bash
npm run roster > supabase/migrations/0004_broker_tier.sql
npm test && npm run typecheck && npm run build
```

Expected: PASS, and `0004_broker_tier.sql` contains 24 `update` statements.

Do **not** apply the migration to Supabase in this task — that is P4's cutover. `VITE_SUPABASE_URL` is not wired to Railway yet, so the site is on the fixture and unaffected.

- [ ] **Step 5: Commit**

```bash
git add scripts/dump-roster.mjs supabase/migrations/0004_broker_tier.sql src/lib/roster-source.ts src/lib/roster-source.test.ts package.json
git commit -m "feat: tier column, generated seed, null-safe fallback"
```

---

## Self-review

**Spec coverage.** §4.1 base → Task 1. §4.2 layers and both rules → Tasks 2, 5. §4.3 occupations → Task 5 (`DESK_GARMENT`, `DESK_HAT`). §4.4 tiers → Task 3. §4.5 instrument assignment → Task 4. §10 tests 1–4, 6 → Tasks 1, 2, 5, 7, 3 respectively. §13 P1 scope → all eight.

**Deliberately deferred, and why.** §10 test 5 (server/client agreement) needs `server/brokers.mjs` to roll tiers too — that belongs with P3, where the program becomes the roll authority, and duplicating it into the Express server now would create a third copy to keep in sync. `BrokerCard` and `BrokerShowcase` changes are P2. Migration application is P4.

**One risk worth naming.** Task 4 adds a required field to `Broker`, so `npm run typecheck` will fail at every construction site across the test suite until each gets a `tier`. That is the intended blast radius — the compiler enumerating the work — not a surprise. Expect it in Task 4 Step 4 and fix them there.
