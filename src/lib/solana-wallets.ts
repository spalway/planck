/**
 * Wallet discovery and connection over the Wallet Standard.
 *
 * Phantom, Solflare and Backpack all register themselves through this
 * standard, so talking to it directly reaches every modern wallet without
 * per-wallet adapter packages.
 *
 * This deliberately does not use @solana/wallet-adapter-react. That package
 * depends on the Solana Mobile adapter, which depends on react-native and
 * metro — the whole React Native build toolchain, ~220MB installed and the
 * source of every advisory in `npm audit`, none of which can reach a browser
 * bundle. The Wallet Standard is what the adapter wraps anyway.
 *
 * The functions here are pure over an injected wallet list, so they can be
 * tested against fakes with no browser and no extension installed.
 */

import type { Wallet, WalletAccount } from "@wallet-standard/base"

const SOLANA_CHAIN = "solana:"

const CONNECT = "standard:connect"
const DISCONNECT = "standard:disconnect"
const EVENTS = "standard:events"

type ConnectFeature = {
  connect: () => Promise<{ accounts: readonly WalletAccount[] }>
}
type DisconnectFeature = { disconnect: () => Promise<void> }
type EventsFeature = { on: (event: "change", listener: () => void) => () => void }

function feature<T>(w: Wallet, name: string): T | null {
  const f = (w.features as Record<string, unknown>)[name]
  return f ? (f as T) : null
}

/** A wallet is usable only if it speaks Solana and can connect. */
export function isSolanaWallet(w: Wallet): boolean {
  const solana = w.chains.some((c) => c.startsWith(SOLANA_CHAIN))
  return solana && feature<ConnectFeature>(w, CONNECT) !== null
}

export function solanaWallets(all: readonly Wallet[]): Wallet[] {
  const seen = new Set<string>()
  return all.filter((w) => {
    if (!isSolanaWallet(w) || seen.has(w.name)) return false
    seen.add(w.name)
    return true
  })
}

/** First Solana account on the wallet, or null if it exposed none. */
export function solanaAccount(
  accounts: readonly WalletAccount[]
): WalletAccount | null {
  return accounts.find((a) => a.chains.some((c) => c.startsWith(SOLANA_CHAIN))) ?? null
}

/**
 * Connect and return the chosen address.
 *
 * Returns null rather than throwing when the user dismisses the wallet
 * prompt — a cancelled connect is an ordinary outcome, not an error.
 */
export async function connectWallet(w: Wallet): Promise<string | null> {
  const f = feature<ConnectFeature>(w, CONNECT)
  if (!f) return null

  try {
    const { accounts } = await f.connect()
    return solanaAccount(accounts)?.address ?? null
  } catch (e) {
    console.warn("[PLANCKBITS] wallet connect failed:", e)
    return null
  }
}

export async function disconnectWallet(w: Wallet): Promise<void> {
  const f = feature<DisconnectFeature>(w, DISCONNECT)
  if (!f) return
  try {
    await f.disconnect()
  } catch (e) {
    console.warn("[PLANCKBITS] wallet disconnect failed:", e)
  }
}

/** Subscribe to account changes. Returns an unsubscribe, or a no-op. */
const NOOP = () => {}

/**
 * Coerce whatever a wallet handed back into something safe to call.
 *
 * The Wallet Standard says `on()` returns an unsubscribe function, but that
 * is a promise made by a browser extension we do not ship and cannot review.
 * The TypeScript type is only as true as the extension chooses to be.
 *
 * This mattered: the raw return value was handed straight to React as an
 * effect cleanup. An extension returning undefined, or an object, made React
 * throw "is not a function" while unmounting — and because that happens
 * during the commit phase, React tore down the entire tree rather than just
 * that component. Every client-side navigation unmounts something, so the
 * result was a blank page on every nav that only a reload could clear.
 *
 * Unsubscribing is also wrapped: a cleanup that throws does the same damage
 * as one that is missing, and there is nothing useful to do about a wallet
 * that fails to let go of a listener.
 */
function asUnsubscribe(value: unknown): () => void {
  if (typeof value !== "function") return NOOP

  return () => {
    try {
      ;(value as () => void)()
    } catch {
      // A wallet that cannot unsubscribe cleanly is not worth crashing over.
    }
  }
}

export function onWalletChange(w: Wallet, cb: () => void): () => void {
  const f = feature<EventsFeature>(w, EVENTS)
  if (!f) return NOOP
  try {
    return asUnsubscribe(f.on("change", cb))
  } catch {
    return NOOP
  }
}

/**
 * The same guard for the wallet registry.
 *
 * getWallets() is provided by whichever extension won the race to define it,
 * so its `on()` deserves exactly as little trust as a wallet's own.
 */
export function asRegistryUnsubscribe(value: unknown): () => void {
  return asUnsubscribe(value)
}
