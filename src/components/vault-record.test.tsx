import { render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { VaultRecord } from "@/components/vault-record"
import type { Holding } from "@/lib/records"

const NVDAX = "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg"

vi.mock("@/lib/jupiter-price", async (orig) => ({
  ...(await orig<typeof import("@/lib/jupiter-price")>()),
  fetchPrices: vi.fn(),
}))

const { fetchPrices } = await import("@/lib/jupiter-price")
const mockFetchPrices = vi.mocked(fetchPrices)

afterEach(() => vi.clearAllMocks())

const HOLDINGS: Holding[] = [{ mint: NVDAX, quantity: 10, costBasisUsd: 2000 }]

describe("VaultRecord", () => {
  it("says the book is empty rather than showing a fake portfolio", async () => {
    mockFetchPrices.mockResolvedValue({})
    render(<VaultRecord holdings={[]} />)
    expect(await screen.findByText(/has not deployed/i)).toBeInTheDocument()
  })

  it("shows the mandate while the book is empty", async () => {
    // Saying only "nothing to show" left the page at ~500px of content, so
    // most of it was empty background and a visitor could not tell what the
    // vault would ever hold.
    mockFetchPrices.mockResolvedValue({})
    render(<VaultRecord holdings={[]} />)

    expect(await screen.findByText(/the mandate/i)).toBeInTheDocument()
    expect(screen.getByText(/never sells/i)).toBeInTheDocument()
    // The instruments themselves, not a description of them.
    expect(screen.getByText("NVDAx")).toBeInTheDocument()
    expect(screen.getByText("PAXG")).toBeInTheDocument()
  })

  it("does not repeat the mandate once the vault holds something", async () => {
    mockFetchPrices.mockResolvedValue({})
    render(<VaultRecord holdings={HOLDINGS} />)
    await screen.findByText("NVDAx")
    expect(screen.queryByText(/the mandate/i)).not.toBeInTheDocument()
  })

  it("renders a holding row with its live value and gain", async () => {
    mockFetchPrices.mockResolvedValue({
      [NVDAX]: {
        mint: NVDAX,
        usdPrice: 250,
        priceChange24h: null,
        fetchedAt: Date.now(),
      },
    })
    render(<VaultRecord holdings={HOLDINGS} />)

    // The totals block and the table both carry these figures, so scope to
    // the row rather than matching document-wide.
    const row = (await screen.findByText("NVDAx")).closest("tr")!
    expect(within(row).getByText("$2,000.00")).toBeInTheDocument()
    expect(within(row).getByText("$2,500.00")).toBeInTheDocument()
    expect(within(row).getByText("+25.00%")).toBeInTheDocument()
  })

  it("reports how many legs are priced", async () => {
    mockFetchPrices.mockResolvedValue({
      [NVDAX]: {
        mint: NVDAX,
        usdPrice: 250,
        priceChange24h: null,
        fetchedAt: Date.now(),
      },
    })
    render(<VaultRecord holdings={HOLDINGS} />)
    expect(await screen.findByText("1 of 1 priced")).toBeInTheDocument()
  })

  it("renders an em dash for an unpriced holding instead of a zero", async () => {
    mockFetchPrices.mockResolvedValue({})
    render(<VaultRecord holdings={HOLDINGS} />)
    const row = (await screen.findByText("NVDAx")).closest("tr")!
    await waitFor(() => expect(within(row).getAllByText("—").length).toBeGreaterThan(0))
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument()
  })
})
