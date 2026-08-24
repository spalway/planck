import * as React from "react"

import { ROSTER, type Broker } from "@/lib/brokers"
import { fetchRoster, rosterSource } from "@/lib/roster-source"

export type RosterState = {
  brokers: Broker[]
  status: "loading" | "ready" | "error"
}

/**
 * The roster, from whichever source is configured.
 *
 * On the fixture this starts already resolved rather than flashing a skeleton
 * for data that is synchronous. Against Supabase it behaves like a normal
 * fetch. Callers handle all three states either way, so turning Supabase on
 * changes no component.
 */
export function useRoster(): RosterState {
  const local = rosterSource() === "fixture"

  const [brokers, setBrokers] = React.useState<Broker[]>(local ? [...ROSTER] : [])
  const [status, setStatus] = React.useState<RosterState["status"]>(
    local ? "ready" : "loading"
  )

  React.useEffect(() => {
    if (local) return

    const controller = new AbortController()
    let cancelled = false

    void (async () => {
      const next = await fetchRoster(controller.signal)
      if (cancelled) return

      if (next === null) {
        setStatus("error")
        return
      }
      setBrokers(next)
      setStatus("ready")
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [local])

  return { brokers, status }
}
