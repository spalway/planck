import { Link } from "react-router-dom"

import { BrokerSprite } from "@/components/broker-sprite"
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
  index: "#1B7F4B",
  bullion: "#B8860B",
  yield: "#6B6459",
  credit: "#C4362B",
}

export function BrokerWall({ brokers }: { brokers: readonly Broker[] }) {
  return (
    <Section id="floor" label="01" title="THE FLOOR">
      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-[0.65rem] tracking-widest text-ink-muted uppercase">
          Tie colour is the desk
        </span>
        {DESKS.map((d) => (
          <span key={d.id} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5"
              style={{ backgroundColor: DESK_SWATCH[d.id] }}
            />
            <span className="text-[0.65rem] tracking-widest text-ink-muted uppercase">
              {d.label}
            </span>
          </span>
        ))}
      </div>

      <ul className="grid grid-cols-3 gap-px border border-ink/15 bg-ink/15 sm:grid-cols-4 lg:grid-cols-6">
        {brokers.map((b) => (
          <li key={b.id} className="min-w-0 bg-paper">
            <Link
              to="/brokers"
              className="flex flex-col items-center gap-2 p-4 hover:bg-ground focus-visible:bg-ground"
            >
              <BrokerSprite broker={b} size={72} />
              <span
                data-testid="wall-name"
                className="w-full truncate text-center font-display text-[0.6rem]"
              >
                {b.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-ink-muted">
        <Link to="/brokers" className="text-cobalt underline">
          See every broker's stats
        </Link>{" "}
        — nerve, latency, coverage and tenure.
      </p>
    </Section>
  )
}
