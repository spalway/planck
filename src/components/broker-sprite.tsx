import type { Broker } from "@/lib/brokers"
import type { DeskId } from "@/lib/instruments"

/**
 * A broker portrait, composed rather than drawn.
 *
 * The roster is generative and Phase 2 reads it from chain, so hand-drawn
 * bitmaps would not survive. This is a 16x16 grid of rects — real pixel art,
 * every pixel placed by trait — and it stays crisp at any scale because it
 * is vector underneath.
 *
 * The first pass was 12x12, which was too cramped to read as a person: no
 * room for a collar, a tie, or a face that looked like a face. 16 rows buys
 * a head, shoulders and a desk-coloured tie, which is what makes the desk
 * legible at a glance across a grid of cards.
 *
 * Skin and hair vary per broker. With one palette all 24 read as the same
 * person duplicated, which undercuts a roster of individuals.
 */

/** The tie carries the desk. It is the one colour that means something. */
const DESK_COLOR: Record<DeskId, string> = {
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

/**
 * 16x16. "." transparent · h hair · s skin · e eye · m mouth
 * c suit · w shirt · t tie (desk colour) · p headset
 */
const BASE = [
  "................",
  ".....hhhhhh.....",
  "...hhhhhhhhhh...",
  "..hhhhhhhhhhhh..",
  "..hhsssssssshh..",
  "..hssssssssssh..",
  "..hsseesseessh..",
  "..hssssssssssh..",
  "..hsssmmmmsssh..",
  "...hssssssssh...",
  "......ssss......",
  "...ccccwwcccc...",
  "..ccccwttwcccc..",
  "..ccccwttwcccc..",
  "..cccccttccccc..",
  "..cccccccccccc..",
]

/** A brimmed hat for high nerve. */
const HAT = ["....hhhhhhhh....", "...hhhhhhhhhh...", ".hhhhhhhhhhhhhh."]

function setAt(row: string, i: number, ch: string): string {
  return row.slice(0, i) + ch + row.slice(i + 1)
}

/** Traits that change the silhouette, so the grid is scannable. */
function compose(b: Broker): string[] {
  const rows = [...BASE]

  if (b.effectiveNerve >= 70) {
    rows[1] = HAT[0]
    rows[2] = HAT[1]
    rows[3] = HAT[2]
  }

  if (b.latency <= 30) {
    // Earpieces plus a boom mic down the left.
    rows[5] = setAt(setAt(rows[5], 2, "p"), 13, "p")
    rows[6] = setAt(setAt(rows[6], 2, "p"), 13, "p")
    rows[7] = setAt(rows[7], 2, "p")
    rows[8] = setAt(rows[8], 3, "p")
  }

  return rows
}

/** Stable per-broker variation. Math.random would reshuffle faces per render. */
function hash(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

export function BrokerSprite({ broker, size = 96 }: { broker: Broker; size?: number }) {
  const rows = compose(broker)
  const h = hash(broker.id)

  const palette: Record<string, string> = {
    h: HAIR[h % HAIR.length],
    s: SKIN[(h >> 3) % SKIN.length],
    c: SUIT[(h >> 6) % SUIT.length],
    e: INK,
    m: MOUTH,
    w: SHIRT,
    t: DESK_COLOR[broker.desk],
    p: HEADSET,
  }

  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      role="img"
      aria-label={`${broker.name}, ${broker.desk} desk`}
      shapeRendering="crispEdges"
      className="pixel shrink-0"
    >
      {rows.map((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={palette[c]}
            />
          ),
        ),
      )}
    </svg>
  )
}

/** Exported for tests: every row must be exactly this wide or the art skews. */
export const SPRITE_SIZE = 16
export const SPRITE_ROWS = BASE
export const SPRITE_HAT = HAT
