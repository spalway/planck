import type { Wallet } from "@wallet-standard/base"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ConnectButton } from "@/components/connect-button"
import type { WalletState } from "@/hooks/use-wallet"

/**
 * The button reads context, so each test injects a WalletState directly
 * rather than standing up a real registry.
 */
const mockState = vi.hoisted(() => ({ current: null as WalletState | null }))

vi.mock("@/components/wallet-context", () => ({
  useWalletContext: () => mockState.current,
}))

function fakeWallet(name: string): Wallet {
  return { name, icon: "data:image/svg+xml;base64,x" } as unknown as Wallet
}

function setup(over: Partial<WalletState> = {}) {
  mockState.current = {
    wallets: [],
    wallet: null,
    address: null,
    connecting: false,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    ...over,
  }
  render(<ConnectButton />)
  return mockState.current
}

describe("ConnectButton", () => {
  it("reads Connect when disconnected", () => {
    setup()
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument()
  })

  it("shows the truncated address when connected", () => {
    setup({ address: "7pt9tkctJPK7PPNQJ77GKg8ZffSF6QxoMiCFYHxrtaCj" })
    expect(screen.getByRole("button", { name: "7pt9…taCj" })).toBeInTheDocument()
  })

  it("lists detected wallets in the picker", () => {
    setup({ wallets: [fakeWallet("Phantom"), fakeWallet("Solflare")] })
    fireEvent.click(screen.getByRole("button", { name: "Connect" }))
    expect(screen.getByRole("button", { name: "Phantom" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Solflare" })).toBeInTheDocument()
  })

  it("says so plainly when no wallet is installed", () => {
    setup({ wallets: [] })
    fireEvent.click(screen.getByRole("button", { name: "Connect" }))
    expect(screen.getByText(/no solana wallet detected/i)).toBeInTheDocument()
  })

  it("connects with the wallet that was clicked", () => {
    const state = setup({ wallets: [fakeWallet("Phantom")] })
    fireEvent.click(screen.getByRole("button", { name: "Connect" }))
    fireEvent.click(screen.getByRole("button", { name: "Phantom" }))
    expect(state.connect).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Phantom" })
    )
  })

  it("shows the full address and a disconnect once connected", () => {
    const full = "7pt9tkctJPK7PPNQJ77GKg8ZffSF6QxoMiCFYHxrtaCj"
    const state = setup({ address: full })
    fireEvent.click(screen.getByRole("button", { name: "7pt9…taCj" }))
    expect(screen.getByText(full)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /disconnect/i }))
    expect(state.disconnect).toHaveBeenCalled()
  })

  it("disables itself while connecting", () => {
    setup({ connecting: true })
    expect(screen.getByRole("button", { name: /connecting/i })).toBeDisabled()
  })

  it("closes the picker on Escape", () => {
    setup({ wallets: [fakeWallet("Phantom")] })
    fireEvent.click(screen.getByRole("button", { name: "Connect" }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
