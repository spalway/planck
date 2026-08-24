import * as React from "react"

import { fetchPrices, type PriceMap } from "@/lib/jupiter-price"

export type PricesState = {
  prices: PriceMap
  status: "loading" | "ready" | "error"
  /** Timestamp of the last successful fetch, or null if none has landed. */
  lastOk: number | null
}

const DEFAULT_INTERVAL_MS = 30_000

/**
 * Poll Jupiter for the given mints.
 *
 * A failed poll does not clear the board. Once prices have landed they stay
 * rendered, flagged stale, until a later poll replaces them — blanking a
 * desk on one dropped request reads as "no data" when the truth is "the
 * number is a minute old".
 */
export function usePrices(
  mints: readonly string[],
  intervalMs: number = DEFAULT_INTERVAL_MS
): PricesState {
  const [prices, setPrices] = React.useState<PriceMap>({})
  const [status, setStatus] = React.useState<PricesState["status"]>("loading")
  const [lastOk, setLastOk] = React.useState<number | null>(null)

  // Join so the effect re-runs on content change, not identity change — the
  // caller almost always passes a fresh array literal.
  const key = mints.join(",")

  React.useEffect(() => {
    if (key === "") return

    const list = key.split(",")
    const controller = new AbortController()
    let cancelled = false

    async function poll() {
      const next = await fetchPrices(list, controller.signal)
      if (cancelled) return

      if (next === null) {
        setStatus("error")
        return
      }

      setPrices(next)
      setLastOk(Date.now())
      setStatus("ready")
    }

    void poll()
    const timer = setInterval(() => void poll(), intervalMs)

    return () => {
      cancelled = true
      controller.abort()
      clearInterval(timer)
    }
  }, [key, intervalMs])

  return { prices, status, lastOk }
}
