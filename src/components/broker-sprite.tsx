import type { Broker } from "@/lib/brokers"
import type { DeskId } from "@/lib/instruments"

/**
 * A broker portrait, composed rather than drawn.
 *
 * The roster is generative and Phase 2 reads it from chain, so hand-drawn
 * bitmaps would not survive. This is a 12x12 grid of rects — real pixel art,
 * every pixel placed by trait — and it stays crisp at any scale because it
 * is vector underneath.
 */

const DESK_COLOR: Record<DeskId, string> = {
  equities: "#2148E2",
  index: "#1B7F4B",
  bullion: "#B8860B",
  yield: "#6B6459",
  credit: "#C4362B",
}

const INK = "#14120F"
const SKIN = "#E8C9A8"

/** Rows of a 12x12 sprite. "." transparent, "i" ink, "s" skin, "d" desk colour. */
const BASE = [
  "....iiii....",
  "...iiiiii...",
  "..issssssi..",
  "..isssssss..",
  "..is.ss.ss..",
  "..isssssss..",
  "..issssssi..",
  "...ssssss...",
  "..dddddddd..",
  ".ddddiidddd.",
  ".ddd.dd.ddd.",
  "..dd....dd..",
]

/** A hat brim for high-nerve brokers; a headset for low-latency ones. */
function overlay(b: Broker): string[] {
  const rows = [...BASE]
  if (b.effectiveNerve >= 70) rows[1] = ".iiiiiiiiii."
  if (b.latency <= 30) {
    rows[4] = ".dis.ss.ssid"
    rows[5] = ".dissssssid."
  }
  return rows
}

const FILL: Record<string, string> = { i: INK, s: SKIN }

export function BrokerSprite({ broker, size = 96 }: { broker: Broker; size?: number }) {
  const rows = overlay(broker)
  const desk = DESK_COLOR[broker.desk]

  return (
    <svg
      viewBox="0 0 12 12"
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
              fill={c === "d" ? desk : FILL[c]}
            />
          )
        )
      )}
    </svg>
  )
}
