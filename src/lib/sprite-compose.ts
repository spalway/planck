/**
 * Broker portrait composition, without React.
 *
 * Split out of broker-sprite.tsx so the social-image generator can render the
 * exact same art the site renders. Duplicating the palettes and the hat/
 * headset rules into a script would drift the day a trait threshold changes,
 * and the profile picture would quietly stop matching the roster.
 *
 * Pure functions over a broker, so both a component and a node script can use
 * them.
 */

import type { Broker } from "@/lib/brokers"
import type { DeskId } from "@/lib/instruments"
import { SPRITE_HAT, SPRITE_ROWS } from "@/lib/sprite-glyphs"

/** The tie carries the desk. It is the one colour that means something. */
export const DESK_COLOR: Record<DeskId, string> = {
  equities: "#2148E2",
  index: "#1B7F4B",
  bullion: "#B8860B",
  yield: "#6B6459",
  credit: "#C4362B",
}

const SKIN = ["#FFDBAC", "#F0C9A4", "#E0AC7E", "#C68642", "#A56B3D", "#8D5524"]
const HAIR = ["#1B1410", "#3B2A1A", "#6B4A2A", "#8C6239", "#2A2A2E", "#59443A"]
const SUIT = ["#2B2F38", "#33383F", "#242830", "#3A3F49"]

const INK = "#14120F"
const SHIRT = "#F7F5F0"
const MOUTH = "#8C5A4A"
const HEADSET = "#2148E2"

/** A hat at this nerve or above. */
export const HAT_AT = 70

/** A headset at this latency or below. */
export const HEADSET_AT = 30

function setAt(row: string, i: number, ch: string): string {
  return row.slice(0, i) + ch + row.slice(i + 1)
}

/** Traits that change the silhouette, so the grid is scannable. */
export function composeSprite(b: Broker): string[] {
  const rows = [...SPRITE_ROWS]

  if (b.effectiveNerve >= HAT_AT) {
    rows[1] = SPRITE_HAT[0]
    rows[2] = SPRITE_HAT[1]
    rows[3] = SPRITE_HAT[2]
  }

  if (b.latency <= HEADSET_AT) {
    // Earpieces plus a boom mic down the left.
    rows[5] = setAt(setAt(rows[5], 2, "p"), 13, "p")
    rows[6] = setAt(setAt(rows[6], 2, "p"), 13, "p")
    rows[7] = setAt(rows[7], 2, "p")
    rows[8] = setAt(rows[8], 3, "p")
  }

  return rows
}

/** Stable per-broker variation. Math.random would reshuffle faces per render. */
export function spriteHash(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/** Glyph character to colour, for one broker. */
export function spritePalette(b: Broker): Record<string, string> {
  const h = spriteHash(b.id)

  return {
    h: HAIR[h % HAIR.length],
    s: SKIN[(h >> 3) % SKIN.length],
    c: SUIT[(h >> 6) % SUIT.length],
    e: INK,
    m: MOUTH,
    w: SHIRT,
    t: DESK_COLOR[b.desk],
    p: HEADSET,
  }
}
