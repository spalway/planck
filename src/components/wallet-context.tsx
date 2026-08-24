import * as React from "react"

import { useWallet, type WalletState } from "@/hooks/use-wallet"

/**
 * One wallet connection for the whole app.
 *
 * useWallet subscribes to the wallet registry and holds connection state, so
 * calling it in two components would give two independent connections that
 * disagree with each other. The header and every page read the same context.
 */
const WalletContext = React.createContext<WalletState | null>(null)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const state = useWallet()
  return <WalletContext.Provider value={state}>{children}</WalletContext.Provider>
}

export function useWalletContext(): WalletState {
  const ctx = React.useContext(WalletContext)
  if (ctx === null) {
    throw new Error("useWalletContext must be used inside <WalletProvider>")
  }
  return ctx
}
