import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DeskBoard } from "@/components/desk-board"
import type { Broker } from "@/lib/brokers"
import type { Holding } from "@/lib/records"

const NVDAX = "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg"

vi.mock("@/lib/jupiter-price", async (orig) => ({
  ...(await orig<typeof import("@/lib/jupiter-price")>()),
  fetchPrices: vi.fn(),
}))

const { fetchPrices } = await import("@/lib/jupiter-price")
const mockFetchPrices = vi.mocked(fetchPrices)

afterEach(() => vi.clearAllMocks())

const BROKERS: Broker[] = [
  { id: "PB-001", name: "MILO ASH", desk: "equities", nerve: 40, latency: 10, coverage: 2, effectiveNerve: 40, tenureHours: 10 },
  { id: "PB-002", name: "RENA BELL", desk: "equities", nerve: 50, latency: 20, coverage: 3, effectiveNerve: 50, tenureHours: 20 },
  { id: "PB-003", name: "OTIS MOSS", desk: "yield", nerve: 60, latency: 30, coverage: 1, effectiveNerve: 60, tenureHours: 30 },
]

function board(holdings: Holding[] = []) {
  return render(<DeskBoard brokers={BROKERS} holdings={holdings} />)
}

describe("DeskBoard", () => {
  it("renders all five desks", async () => {
    mockFetchPrices.mockResolvedValue({})
    board()
    for (const label of ["EQUITIES", "INDEX", "BULLION", "YIELD", "CREDIT"]) {
      expect(await screen.findByText(label)).toBeInTheDocument()
    }
  })

  it("shows a live price once it lands", async () => {
    mockFetchPrices.mockResolvedValue({
      [NVDAX]: { mint: NVDAX, usdPrice: 259.49, priceChange24h: 0.16, fetchedAt: Date.now() },
    })
    board()
    expect(await screen.findByText("$259.49")).toBeInTheDocument()
    expect(await screen.findByText("+0.16%")).toBeInTheDocument()
  })

  it("shows an em dash, never $0, for an unpriced instrument", async () => {
    mockFetchPrices.mockResolvedValue({})
    board()
    await waitFor(() => expect(screen.getAllByText("—").length).toBeGreaterThan(0))
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument()
    expect(screen.queryByText("$0.0000")).not.toBeInTheDocument()
  })

  it("surfaces a feed error without blanking the board", async () => {
    mockFetchPrices.mockResolvedValue(null)
    board()
    expect(await screen.findByText(/feed unavailable/i)).toBeInTheDocument()
    expect(screen.getByText("EQUITIES")).toBeInTheDocument()
  })

  it("lists every instrument symbol on the board", async () => {
    mockFetchPrices.mockResolvedValue({})
    board()
    expect(await screen.findByText("NVDAx")).toBeInTheDocument()
    expect(screen.getByText("syrupUSDC")).toBeInTheDocument()
    expect(screen.getByText("GLDx")).toBeInTheDocument()
  })

  it("counts the brokers assigned to each desk", async () => {
    mockFetchPrices.mockResolvedValue({})
    board()
    expect(await screen.findByTestId("desk-brokers-equities")).toHaveTextContent("2 brokers")
    expect(screen.getByTestId("desk-brokers-yield")).toHaveTextContent("1 broker")
    expect(screen.getByTestId("desk-brokers-credit")).toHaveTextContent("0 brokers")
  })

  it("shows the desk's holding value once the vault has deployed", async () => {
    mockFetchPrices.mockResolvedValue({
      [NVDAX]: { mint: NVDAX, usdPrice: 250, priceChange24h: null, fetchedAt: Date.now() },
    })
    board([{ mint: NVDAX, quantity: 10, costBasisUsd: 2000 }])
    expect(await screen.findByTestId("desk-value-equities")).toHaveTextContent("$2,500.00")
  })

  it("shows an em dash for the value of a desk holding nothing", async () => {
    mockFetchPrices.mockResolvedValue({})
    board()
    expect(await screen.findByTestId("desk-value-bullion")).toHaveTextContent("—")
  })
})
