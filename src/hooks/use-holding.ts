import * as React from "react"

import { useWalletContext } from "@/components/wallet-context"
import { fetchHolding, type ApiFailure, type Holding } from "@/lib/token-api"

export type HoldingState =
  | { status: "disconnected" }
  | { status: "checking" }
  | { status: "known"; holding: Holding }
  | { status: "unavailable"; reason: ApiFailure }

/**
 * Whether the connected wallet holds $SBIT.
 *
 * Gating minting on this is the token's only job in the product, so the states
 * are kept distinct: not connected, checking, known, and could-not-tell. They
 * are not collapsed into a boolean, because "we could not check" must never
 * render as "you do not hold any" — that would accuse a holder of not holding.
 */
export function useHolding(): HoldingState {
  const { address } = useWalletContext()
  const [state, setState] = React.useState<HoldingState>({ status: "disconnected" })

  React.useEffect(() => {
    if (address === null) {
      setState({ status: "disconnected" })
      return
    }

    setState({ status: "checking" })

    const controller = new AbortController()
    let cancelled = false

    void (async () => {
      const result = await fetchHolding(address, controller.signal)
      if (cancelled) return

      setState(
        result.ok
          ? { status: "known", holding: result.data }
          : { status: "unavailable", reason: result.reason }
      )
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [address])

  return state
}
