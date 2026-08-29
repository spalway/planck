import { Link } from "react-router-dom"

import { BrokerSprite } from "@/components/broker-sprite"
import { EmptyFloor } from "@/components/empty-floor"
import { Section } from "@/components/primitives"
import type { Broker } from "@/lib/brokers"
import { DESKS } from "@/lib/instruments"

/**
 * The whole floor as a contact sheet.
 *
 * Twenty-four portraits at a glance is the fastest argument that these are
 * individuals rather than one sprite recoloured — which is exactly the doubt
 * a generative roster has to overcome. Stats stay on /brokers; this is the
 * shop window.
 */

/** The tie colour is the desk, so the legend teaches the code once. */
const DESK_SWATCH: Record<Broker["desk"], string> = {
  equities: "#2148E2",
  index: "#1B6B3F",
  bullion: "#B8860B",
  yield: "#6D5B48",
  credit: "#B3352A",
}

export function BrokerWall({ brokers }: { brokers: readonly Broker[] }) {
  // Nobody on the floor: the legend teaches a code that nothing is using, and
  // the grid would be a slab of ground colour. Show the empty floor instead.
  if (brokers.length === 0) {
    return (
      <Section id="floor" label="01" title="the floor">
        <EmptyFloor />
      </Section>
    )
  }

  return (
    <Section id="floor" label="01" title="the floor">
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[0.65rem] tracking-widest text-ink-muted">
          Tie colour is the desk
        </span>
        {DESKS.map((d) => (
          <span
            key={d.id}
            className="flex items-center gap-1.5 border-2 border-ink/25 px-1.5 py-0.5"
          >
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 border border-ink/40"
              style={{ backgroundColor: DESK_SWATCH[d.id] }}
            />
            <span className="text-[0.65rem] tracking-widest text-ink-muted">
              {d.label}
            </span>
          </span>
        ))}
      </div>

      {/* The gaps over a dark brown ground draw the grid lines, so the sheet
          is one framed object rather than 24 outlined boxes.

          Brown rather than black. The last row rarely fills, so the ground is
          not just hairlines between cells — it is a solid block of whatever
          colour this is, sitting in the open at the end of the grid. Black
          read as a hole in the page. */}
      <ul className="panel grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-0.5 bg-bar p-0">
        {brokers.map((b) => (
          <li key={b.id} className="min-w-0 bg-paper">
            <Link
              to="/brokers"
              className="flex flex-col items-center gap-2 p-4 hover:bg-tan focus-visible:bg-tan"
            >
              <BrokerSprite broker={b} size={72} />
              <span
                data-testid="wall-name"
                className="w-full truncate text-center font-display text-[0.6rem] font-bold"
              >
                {b.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-xs text-ink-muted">
        <Link to="/brokers" className="font-bold text-cobalt underline">
          See every broker's stats
        </Link>{" "}
        — nerve, latency, coverage and tenure.
      </p>
    </Section>
  )
}
