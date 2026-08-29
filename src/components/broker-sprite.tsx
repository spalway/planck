import type { Broker } from "@/lib/brokers"
import { SPRITE_SIZE } from "@/lib/sprite-base"
import { composeSprite, spritePalette } from "@/lib/sprite-compose"

/**
 * A broker portrait, composed rather than drawn.
 *
 * The roster is generative and the program will read it from chain, so
 * hand-drawn bitmaps would not survive. This is a 24x24 grid of rects — real
 * pixel art, every pixel placed by trait — and it stays crisp at any scale
 * because it is vector underneath.
 *
 * It was 16x16 and read as a person in a suit. 24 is what buys a chimp with a
 * beanie, a headset or a cigarette as distinguishable shapes: 576 pixels
 * against 256. The ceiling is the Solana transaction, not the layout — a
 * 24x24 indexed PNG base64s small enough to ride inside the mint, and 32x32
 * does not.
 *
 * The composition lives in lib/sprite-compose.ts, with no React, so the
 * social-image generator renders the same art rather than a copy of it.
 */
export function BrokerSprite({ broker, size = 96 }: { broker: Broker; size?: number }) {
  const rows = composeSprite(broker)
  const palette = spritePalette(broker)

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
      {/* No ground rect. A flat square behind the chimp read as a sticker
          pasted onto the panel, and it fought the sunk well it sits in. The
          portrait is a cutout: it takes the surface behind it, here and in
          the PNG that goes on chain. Tier is carried by the fur, which was
          always the part that read at thumbnail size anyway. */}
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
