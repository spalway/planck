import { getWallets } from "@wallet-standard/app"
import type { Wallet } from "@wallet-standard/base"
import * as React from "react"

import {
  asRegistryUnsubscribe,
  connectWallet,
  disconnectWallet,
  onWalletChange,
  solanaAccount,
  solanaWallets,
} from "@/lib/solana-wallets"

/** Remembering the wallet, never the address — the address comes from the wallet. */
const LAST_WALLET_KEY = "apebits.wallet.v1"

export type WalletState = {
  /** Solana wallets currently registered in the page. */
  wallets: Wallet[]
  /** The connected wallet, or null. */
  wallet: Wallet | null
  address: string | null
  connecting: boolean
  connect: (w: Wallet) => Promise<void>
  disconnect: () => Promise<void>
}

function remember(name: string | null) {
  try {
    if (name === null) localStorage.removeItem(LAST_WALLET_KEY)
    else localStorage.setItem(LAST_WALLET_KEY, name)
  } catch {
    // Private browsing can throw. Reconnecting by hand still works.
  }
}

function remembered(): string | null {
  try {
    return localStorage.getItem(LAST_WALLET_KEY)
  } catch {
    return null
  }
}

/**
 * Wallet connection over the Wallet Standard.
 *
 * Wallets register asynchronously — an extension can appear after React has
 * mounted — so this subscribes to the registry rather than reading it once.
 *
 * Reconnection is silent and only ever to a wallet the user previously chose:
 * a wallet already holding an authorised account exposes it without a prompt,
 * and popping a wallet dialog at page load would be hostile.
 */
export function useWallet(): WalletState {
  const [wallets, setWallets] = React.useState<Wallet[]>([])
  const [wallet, setWallet] = React.useState<Wallet | null>(null)
  const [address, setAddress] = React.useState<string | null>(null)
  const [connecting, setConnecting] = React.useState(false)

  // Track the registry, including wallets that register after mount.
  React.useEffect(() => {
    const registry = getWallets()
    const sync = () => setWallets(solanaWallets(registry.get()))

    sync()
    // Guarded: whichever extension defined getWallets() decides what on()
    // returns, and a non-function here crashed React during unmount.
    const offRegister = asRegistryUnsubscribe(registry.on("register", sync))
    const offUnregister = asRegistryUnsubscribe(registry.on("unregister", sync))

    return () => {
      offRegister()
      offUnregister()
    }
  }, [])

  // Silent reconnect to the previously chosen wallet, if it already has an
  // authorised account. No prompt is shown.
  React.useEffect(() => {
    if (wallet !== null) return

    const name = remembered()
    if (name === null) return

    const match = wallets.find((w) => w.name === name)
    if (!match) return

    const existing = solanaAccount(match.accounts)
    if (!existing) return

    setWallet(match)
    setAddress(existing.address)
  }, [wallets, wallet])

  // A wallet can switch or lock its account while connected.
  React.useEffect(() => {
    if (wallet === null) return

    return onWalletChange(wallet, () => {
      const next = solanaAccount(wallet.accounts)
      if (next) {
        setAddress(next.address)
        return
      }
      setWallet(null)
      setAddress(null)
      remember(null)
    })
  }, [wallet])

  const connect = React.useCallback(async (w: Wallet) => {
    setConnecting(true)
    try {
      const next = await connectWallet(w)
      if (next === null) return
      setWallet(w)
      setAddress(next)
      remember(w.name)
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = React.useCallback(async () => {
    if (wallet !== null) await disconnectWallet(wallet)
    setWallet(null)
    setAddress(null)
    remember(null)
  }, [wallet])

  return { wallets, wallet, address, connecting, connect, disconnect }
}
