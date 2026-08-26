import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const CA = "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6"

async function load(ca: string) {
  vi.resetModules()
  vi.stubEnv("VITE_PLANCK_CA", ca)
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
    const C = await load(CA)
    render(<C />)
    expect(screen.getByTestId("contract-address")).toHaveTextContent(CA)
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
    const C = await load(CA)
    render(<C />)
    fireEvent.click(screen.getByRole("button", { name: "Copy" }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(CA)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument()
    )
  })

  it("states what the fees do", async () => {
    const C = await load(CA)
    render(<C />)
    expect(screen.getByText(/creator fees/i)).toBeInTheDocument()
  })

  it("shows no price, chart or ticker", async () => {
    const C = await load(CA)
    const { container } = render(<C />)
    // The token's whole presence is an address and one line of purpose.
    expect(container.textContent).not.toMatch(/\$\d/)
    expect(container.querySelector("svg")).toBeNull()
    expect(container.querySelector("canvas")).toBeNull()
  })
})
