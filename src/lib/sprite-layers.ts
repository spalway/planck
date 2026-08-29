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
    put(g, 1, 8, 15, "H")
    g[1][7] = "o"
    g[1][16] = "o"
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
    put(g, 16, 6, 17, "c")
    put(g, 16, 10, 13, "f")
    put(g, 17, 4, 19, "c")
    put(g, 17, 9, 14, "f")
    for (const r of [19, 20]) {
      put(g, r, 9, 9, "T")
      put(g, r, 14, 14, "T")
    }
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
      put(g, r, 7, 8, "c")
      put(g, r, 15, 16, "c")
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
