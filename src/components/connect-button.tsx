import type { Wallet } from "@wallet-standard/base"
import * as React from "react"

import { useWalletContext } from "@/components/wallet-context"
import { shortAddress } from "@/lib/format"

/**
 * Connect, and the wallet picker behind it.
 *
 * Hand-built rather than using @solana/wallet-adapter-react-ui: that package
 * ships a dark, rounded modal that would look imported on bone paper, and it
 * drags in the React Native toolchain. See lib/solana-wallets.ts.
 */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  // Escape should close a dialog; a mouse is not the only way out.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm border border-ink/25 bg-paper p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-base">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-xs tracking-widest text-ink-muted uppercase hover:text-ink"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function WalletRow({
  wallet,
  onPick,
}: {
  wallet: Wallet
  onPick: (w: Wallet) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(wallet)}
      className="flex w-full items-center gap-3 border border-ink/15 px-3 py-2.5 text-left hover:border-cobalt hover:text-cobalt"
    >
      {/* Wallet-supplied data URI. Decorative — the name is the label. */}
      <img src={wallet.icon} alt="" className="h-5 w-5 shrink-0" />
      <span className="text-sm">{wallet.name}</span>
    </button>
  )
}

export function ConnectButton() {
  const { wallets, address, connecting, connect, disconnect } = useWalletContext()
  const [open, setOpen] = React.useState(false)

  async function pick(w: Wallet) {
    await connect(w)
    setOpen(false)
  }

  async function leave() {
    await disconnect()
    setOpen(false)
  }

  const label = connecting ? "Connecting…" : address ? shortAddress(address) : "Connect"

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={connecting}
        className="num shrink-0 border border-ink/25 px-3 py-1.5 text-xs tracking-widest uppercase hover:border-cobalt hover:text-cobalt disabled:cursor-wait disabled:text-ink-muted"
      >
        {label}
      </button>

      {open && !address && (
        <Modal title="CONNECT A WALLET" onClose={() => setOpen(false)}>
          {wallets.length === 0 ? (
            <p className="text-sm leading-relaxed text-ink-muted">
              No Solana wallet detected in this browser. Install Phantom, Solflare or
              Backpack, then reload this page.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {wallets.map((w) => (
                <WalletRow key={w.name} wallet={w} onPick={pick} />
              ))}
            </div>
          )}
        </Modal>
      )}

      {open && address && (
        <Modal title="WALLET" onClose={() => setOpen(false)}>
          <p className="text-[0.65rem] tracking-widest text-ink-muted uppercase">
            Connected
          </p>
          <p className="num mt-1 text-xs break-all">{address}</p>

          <button
            type="button"
            onClick={leave}
            className="mt-5 w-full border border-ink/25 py-2 text-xs tracking-widest uppercase hover:border-loss hover:text-loss"
          >
            Disconnect
          </button>
        </Modal>
      )}
    </>
  )
}
