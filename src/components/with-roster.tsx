import type * as React from "react"

import { useRoster } from "@/hooks/use-roster"
import type { Broker } from "@/lib/brokers"

/**
 * Renders children only once the roster is available.
 *
 * On the local fixture this resolves on the first render, so the loading
 * branch is dead code today — it exists so switching to Supabase needs no
 * change in any page.
 */
export function WithRoster({
  children,
}: {
  children: (brokers: Broker[]) => React.ReactNode
}) {
  const { brokers, status } = useRoster()

  if (status === "loading") {
    return (
      <section className="border-t border-ink/15 py-14">
        <p className="text-sm text-ink-muted">Loading the floor…</p>
      </section>
    )
  }

  if (status === "error") {
    return (
      <section className="border-t border-ink/15 py-14">
        <p className="border border-loss/30 bg-loss/5 px-3 py-2 text-sm text-loss">
          The roster could not be loaded. Nothing is shown rather than showing numbers
          we cannot stand behind.
        </p>
      </section>
    )
  }

  return <>{children(brokers)}</>
}
