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
    <figure className="flex flex-col items-center gap-4">
      <div className="relative border border-ink/15 bg-paper p-6">
        {/* Corner ticks — a mounted print, not a floating image. */}
        <span className="absolute top-0 left-0 h-3 w-3 border-t border-l border-ink/40" />
        <span className="absolute top-0 right-0 h-3 w-3 border-t border-r border-ink/40" />
        <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-ink/40" />
        <span className="absolute right-0 bottom-0 h-3 w-3 border-r border-b border-ink/40" />

        <BrokerSprite broker={broker} size={168} />
      </div>

      <figcaption className="text-center">
        <p className="font-display text-sm">{broker.name}</p>
        <p className="num mt-1 text-[0.65rem] text-ink-muted">
          {broker.id} · <span className="text-cobalt">{deskLabel(broker.desk)}</span>
        </p>
      </figcaption>
    </figure>
  )
}
