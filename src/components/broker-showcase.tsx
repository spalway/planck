import * as React from "react"

import { BrokerSprite } from "@/components/broker-sprite"
import type { Broker } from "@/lib/brokers"
import { DESKS } from "@/lib/instruments"

/**
 * The hero's featured broker, cycling slowly through the floor.
 *
 * The roster is the most characteristic thing the firm has, and a static
 * single portrait undersells that there are two dozen distinct ones. Cycling
 * shows the variety in the first few seconds without asking anyone to click.
 *
 * Deliberately slow — this is ambient, not a carousel demanding attention.
 */

const CYCLE_MS = 2600

function deskLabel(id: Broker["desk"]) {
  return DESKS.find((d) => d.id === id)?.label ?? id.toUpperCase()
}

/** Respects the OS setting; a looping animation is exactly what it asks about. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  return reduced
}

export function BrokerShowcase({ brokers }: { brokers: readonly Broker[] }) {
  const reduced = usePrefersReducedMotion()
  const [i, setI] = React.useState(0)

  React.useEffect(() => {
    if (reduced || brokers.length < 2) return
    const t = setInterval(() => setI((n) => (n + 1) % brokers.length), CYCLE_MS)
    return () => clearInterval(t)
  }, [reduced, brokers.length])

  if (brokers.length === 0) return null

  const broker = brokers[i % brokers.length]

  return (
    <figure className="panel flex flex-col items-center gap-3 p-3">
      {/* The portrait sits in a sunk well so the frame reads as a mount with
          depth rather than as one more outlined box on the page. */}
      <div className="panel-sunk relative w-full px-6 py-6">
        {/* Corner ticks — a mounted print, not a floating image. */}
        <span className="absolute top-1 left-1 h-3 w-3 border-t-2 border-l-2 border-ink/60" />
        <span className="absolute top-1 right-1 h-3 w-3 border-t-2 border-r-2 border-ink/60" />
        <span className="absolute bottom-1 left-1 h-3 w-3 border-b-2 border-l-2 border-ink/60" />
        <span className="absolute right-1 bottom-1 h-3 w-3 border-r-2 border-b-2 border-ink/60" />

        <div className="flex justify-center">
          <BrokerSprite broker={broker} size={168} />
        </div>
      </div>

      <figcaption className="w-full border-t-2 border-ink/20 pt-2 text-center">
        <p className="font-display text-sm font-bold">{broker.name}</p>
        <p className="num mt-1 text-[0.65rem] text-ink-muted">
          {broker.id} · <span className="text-cobalt">{deskLabel(broker.desk)}</span>
        </p>
      </figcaption>
    </figure>
  )
}
