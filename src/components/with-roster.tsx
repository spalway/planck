import type * as React from "react"

import { useRoster } from "@/hooks/use-roster"
import type { Broker } from "@/lib/brokers"

/**
 * Renders the page once the roster has settled, whether or not it arrived.
 *
 * It used to replace the whole page with one red sentence when the fetch
 * failed. That is the wrong trade: a paused database took down the wordmark,
 * the contract address and the mint button along with the floor, so a
 * recoverable outage looked like a dead site.
 *
 * Now a failure renders the page with an empty roster and says so in a
 * banner. The components that draw the floor handle the empty case; nothing
 * invents brokers to fill it, so we still show no numbers we cannot stand
 * behind.
 */
export function WithRoster({
  children,
}: {
  children: (brokers: Broker[], failed: boolean) => React.ReactNode
}) {
  const { brokers, status } = useRoster()

  if (status === "loading") {
    return (
      <section className="rule py-14">
        <p className="text-sm text-ink-muted">Loading the floor…</p>
      </section>
    )
  }

  // No banner. A red bar across the top of the page made a recoverable
  // outage look like a fault in the whole site; the floor itself says it
  // cannot be read, which is where someone is already looking.
  return <>{children(brokers, status === "error")}</>
}
