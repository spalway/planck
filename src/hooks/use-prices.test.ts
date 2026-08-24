import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { usePrices } from "@/hooks/use-prices"

const MINT = "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6"

vi.mock("@/lib/jupiter-price", async (orig) => ({
  ...(await orig<typeof import("@/lib/jupiter-price")>()),
  fetchPrices: vi.fn(),
}))

const { fetchPrices } = await import("@/lib/jupiter-price")
const mockFetchPrices = vi.mocked(fetchPrices)

const QUOTE = {
  [MINT]: { mint: MINT, usdPrice: 1.14, priceChange24h: null, fetchedAt: 1 },
}

afterEach(() => vi.clearAllMocks())

describe("usePrices", () => {
  it("starts in loading with no prices", () => {
    mockFetchPrices.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePrices([MINT]))
    expect(result.current.status).toBe("loading")
    expect(result.current.prices).toEqual({})
  })

  it("moves to ready and exposes the fetched prices", async () => {
    mockFetchPrices.mockResolvedValue(QUOTE)
    const { result } = renderHook(() => usePrices([MINT]))
    await waitFor(() => expect(result.current.status).toBe("ready"))
    expect(result.current.prices[MINT].usdPrice).toBe(1.14)
    expect(result.current.lastOk).not.toBeNull()
  })

  it("reports error when the fetch fails", async () => {
    mockFetchPrices.mockResolvedValue(null)
    const { result } = renderHook(() => usePrices([MINT]))
    await waitFor(() => expect(result.current.status).toBe("error"))
  })

  it("keeps the last good prices when a later poll fails", async () => {
    mockFetchPrices.mockResolvedValueOnce(QUOTE).mockResolvedValue(null)
    const { result } = renderHook(() => usePrices([MINT], 200))
    await waitFor(() => expect(result.current.status).toBe("ready"))
    await waitFor(() => expect(result.current.status).toBe("error"))
    // The board keeps rendering the stale number rather than blanking out.
    expect(result.current.prices[MINT].usdPrice).toBe(1.14)
  })

  it("does not fetch when given no mints", () => {
    renderHook(() => usePrices([]))
    expect(mockFetchPrices).not.toHaveBeenCalled()
  })
})
