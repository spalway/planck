import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// On Solana the contract address IS the mint address. One variable.
const MINT = "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6"

async function load(mint: string) {
  vi.resetModules()
  vi.stubEnv("VITE_PLANCK_MINT", mint)
  return (await import("@/components/contract-section")).ContractSection
}

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("ContractSection", () => {
  it("shows the address once one is configured", async () => {
    const C = await load(MINT)
    render(<C />)
    expect(screen.getByTestId("contract-address")).toHaveTextContent(MINT)
  })

  it("says it is not live yet when there is no address", async () => {
    const C = await load("")
    render(<C />)
    expect(screen.getByText(/not live yet/i)).toBeInTheDocument()
    expect(screen.queryByTestId("contract-address")).not.toBeInTheDocument()
  })

  it("offers no copy button when there is nothing to copy", async () => {
    const C = await load("")
    render(<C />)
    expect(screen.queryByRole("button", { name: /copy/i })).not.toBeInTheDocument()
  })

  it("copies the address and confirms", async () => {
    const C = await load(MINT)
    render(<C />)
    fireEvent.click(screen.getByRole("button", { name: "Copy" }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(MINT)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument()
    )
  })

  it("labels the address with the ticker and says nothing else", async () => {
    // The section used to carry a line explaining what the fees do. It was
    // removed on purpose: the address is the whole of the token's presence
    // here, and the mechanism is argued for elsewhere on the page.
    const C = await load(MINT)
    render(<C />)
    expect(screen.getByText(/\$SBIT contract/i)).toBeInTheDocument()
    expect(screen.queryByText(/creator fees/i)).not.toBeInTheDocument()
  })

  it("shows no price, chart or ticker", async () => {
    const C = await load(MINT)
    const { container } = render(<C />)
    // The token's whole presence is an address and one line of purpose.
    expect(container.textContent).not.toMatch(/\$\d/)
    expect(container.querySelector("svg")).toBeNull()
    expect(container.querySelector("canvas")).toBeNull()
  })
})
