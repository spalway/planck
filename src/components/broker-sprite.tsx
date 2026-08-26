import type { Broker } from "@/lib/brokers"
import { composeSprite, spritePalette } from "@/lib/sprite-compose"

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
 * The composition itself lives in lib/sprite-compose.ts, with no React, so
 * the social-image generator renders the same art rather than a copy of it.
 */
export function BrokerSprite({ broker, size = 96 }: { broker: Broker; size?: number }) {
  const rows = composeSprite(broker)
  const palette = spritePalette(broker)

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
