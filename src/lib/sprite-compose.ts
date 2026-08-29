/**
 * Broker portrait composition, without React.
 *
 * Split from the component so the social-image generator renders the exact
 * art the site renders. Duplicating palettes into a script would drift the
 * day a threshold moves, and the profile picture would quietly stop matching
 * the roster.
 *
 * Pure functions over a broker, so a component, a node script and the mint
 * transaction all produce identical pixels — which matters, because the
 * program stores a hash of them.
 */

import type { Broker } from "@/lib/brokers"
import type { DeskId } from "@/lib/instruments"
import { BASE_ROWS, fromGrid, toGrid } from "@/lib/sprite-base"
import {
  EYEWEAR,
  GARMENT,
  HEADWEAR,
  MOUTH,
  type EyewearId,
  type GarmentId,
  type HeadwearId,
  type MouthId,
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

/**
 * The occupation behind each desk, read off the instruments it carries.
 *
 * EQUITIES is NVDA, TSLA, META, GOOGL — a tech analyst, so a hoodie. BULLION
 * is allocated gold, so a vault keeper in coveralls. The outfit is
 * information: it is how the desk stays readable at roster size.
 */
const DESK_GARMENT: Record<DeskId, GarmentId> = {
  equities: "hoodie",
  index: "jacket",
  bullion: "coveralls",
  yield: "shirtsleeves",
  credit: "suit",
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

/** A hat at this effective nerve or above. */
export const HAT_AT = 60
/** A headset at this latency or below. */
export const HEADSET_AT = 30
/** Shades at this latency or above. */
export const SHADES_AT = 80

/** Stable per-broker variation. Math.random would reshuffle faces per render. */
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
 * — the portrait shows what is remarkable about him, not an inventory. At
 * 24px a third accessory does not read as detail, it reads as a smudge.
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
    b.coverage >= 7
      ? "cigar"
      : b.coverage >= 4
        ? "cigarette"
        : b.coverage >= 2
          ? "pen"
          : "none"

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
    // The hat accent is a shade of the hat, NOT the desk colour. Painting the
    // band with the desk put that colour on the hat and the tie at once, and
    // a beanie with a cobalt fold read as a sweatband rather than a beanie.
    // The desk is the tie, and only the tie.
    G: tier.dark ? "#171b21" : "#2f2119",
    S: "#14120f",
    L: tier.dark ? "#0b3a42" : "#241f1b",
    K: "#f4f1ea",
    R: "#ff5b1a",
  }
}
