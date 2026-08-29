import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { MintPage } from "@/pages/mint"
import type { HoldingState } from "@/hooks/use-holding"
import type { WalletState } from "@/hooks/use-wallet"

const WALLET = "7pt9tkctJPK7PPNQJ77GKg8ZffSF6QxoMiCFYHxrtaCj"

const state = vi.hoisted(() => ({
  wallet: null as WalletState | null,
  holding: null as HoldingState | null,
}))

vi.mock("@/components/wallet-context", () => ({
  useWalletContext: () => state.wallet,
}))
vi.mock("@/hooks/use-holding", () => ({
  useHolding: () => state.holding,
}))
vi.mock("@/lib/token-api", () => ({ mintBroker: vi.fn() }))

const { mintBroker } = await import("@/lib/token-api")
const mockMint = vi.mocked(mintBroker)

function setup(holding: HoldingState, address: string | null = WALLET) {
  state.wallet = {
    wallets: [], wallet: null, address, connecting: false,
    connect: vi.fn(), disconnect: vi.fn(),
  }
  state.holding = holding
  render(<MintPage />)
}

const HOLDER: HoldingState = {
  status: "known",
  holding: { wallet: WALLET, mint: "m", holds: true, amount: 25000 },
}

describe("MintPage", () => {
  it("asks for a wallet when none is connected, and offers the action", () => {
    setup({ status: "disconnected" }, null)
    expect(screen.getByText(/connect wallet to mint/i)).toBeInTheDocument()
    // The prompt used to say the button was "in the header" and offer
    // nothing; a visitor had to go looking. The action lives with the ask.
    expect(screen.getByRole("button", { name: /connect/i })).toBeInTheDocument()
  })

  it("explains what a mint rolls for when the visitor cannot mint", () => {
    // /mint was a heading, a paragraph and one box — most of the page was
    // empty background, and nobody without a wallet learned anything.
    setup({ status: "disconnected" }, null)
    expect(screen.getByText(/what you roll for/i)).toBeInTheDocument()
    expect(screen.getByText(/desk odds/i)).toBeInTheDocument()
  })

  it("drops the explainer once minting is actually open", () => {
    // The action is the point for a confirmed holder; the explainer would
    // only push the button down the page.
    setup(HOLDER)
    expect(screen.queryByText(/what you roll for/i)).not.toBeInTheDocument()
  })

  it("says the token has not launched rather than showing an error", () => {
    setup({ status: "unavailable", reason: "not_launched" })
    expect(screen.getByText(/has not launched yet/i)).toBeInTheDocument()
  })

  it("blames itself, not the visitor, when the check fails", () => {
    // A failed check must never read as "you do not hold any".
    setup({ status: "unavailable", reason: "unavailable" })
    expect(screen.getByText(/our problem, not yours/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /mint a broker/i })).not.toBeInTheDocument()
  })

  it("refuses a non-holder without offering the button", () => {
    setup({
      status: "known",
      holding: { wallet: WALLET, mint: "m", holds: false, amount: 0 },
    })
    expect(screen.getByText(/holds no \$SBIT/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /mint a broker/i })).not.toBeInTheDocument()
  })

  it("offers the button to a holder and shows the balance", () => {
    setup(HOLDER)
    expect(screen.getByText("25,000")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /mint a broker/i })).toBeEnabled()
  })

  it("renders the rolled broker on success", async () => {
    mockMint.mockResolvedValue({
      ok: true,
      broker: {
        id: "PB-ABC123", name: "MILO ASH", desk: "equities",
        nerve: 40, latency: 12, coverage: 3, effective_nerve: 40, tenure_hours: 0,
      },
    })
    setup(HOLDER)
    fireEvent.click(screen.getByRole("button", { name: /mint a broker/i }))

    expect(await screen.findByText("MILO ASH")).toBeInTheDocument()
    expect(screen.getByText("PB-ABC123")).toBeInTheDocument()
    expect(screen.getByText("EQUITIES")).toBeInTheDocument()
  })

  it("reports the cap with its number", async () => {
    mockMint.mockResolvedValue({ ok: false, reason: "mint_cap_reached", cap: 5 })
    setup(HOLDER)
    fireEvent.click(screen.getByRole("button", { name: /mint a broker/i }))
    expect(await screen.findByText(/maximum of 5 brokers/i)).toBeInTheDocument()
  })

  it("reassures that a failed mint charged nothing", async () => {
    mockMint.mockResolvedValue({ ok: false, reason: "unavailable" })
    setup(HOLDER)
    fireEvent.click(screen.getByRole("button", { name: /mint a broker/i }))
    expect(await screen.findByText(/nothing was charged/i)).toBeInTheDocument()
  })

  it("disables the button while the roll is in flight", async () => {
    mockMint.mockReturnValue(new Promise(() => {}))
    setup(HOLDER)
    fireEvent.click(screen.getByRole("button", { name: /mint a broker/i }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /rolling/i })).toBeDisabled()
    )
  })
})
