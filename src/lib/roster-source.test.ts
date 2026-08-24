import { afterEach, describe, expect, it, vi } from "vitest"

import { ROSTER } from "@/lib/brokers"
import { fetchRoster, rosterSource, rowToBroker } from "@/lib/roster-source"

vi.mock("@/lib/supabase", () => ({
  supabaseConfigured: vi.fn(() => false),
  selectFrom: vi.fn(),
}))

const { selectFrom, supabaseConfigured } = await import("@/lib/supabase")
const mockConfigured = vi.mocked(supabaseConfigured)
const mockSelect = vi.mocked(selectFrom)

afterEach(() => {
  vi.clearAllMocks()
  mockConfigured.mockReturnValue(false)
})

const ROW = {
  id: "PB-001",
  name: "MILO ASH",
  desk: "equities" as const,
  nerve: 40,
  latency: 10,
  coverage: 2,
  effective_nerve: 40,
  tenure_hours: 120,
}

describe("rowToBroker", () => {
  it("maps a well-formed row", () => {
    const b = rowToBroker(ROW)
    expect(b).toMatchObject({
      id: "PB-001",
      name: "MILO ASH",
      desk: "equities",
      effectiveNerve: 40,
      tenureHours: 120,
    })
  })

  it("recomputes effective nerve when the column is null", () => {
    // yield holds one instrument, so 4 of 5 coverage points are surplus.
    const b = rowToBroker({
      ...ROW,
      desk: "yield",
      nerve: 40,
      coverage: 5,
      effective_nerve: null,
    })
    expect(b?.effectiveNerve).toBe(44)
  })

  it("defaults a null tenure to zero rather than NaN", () => {
    expect(rowToBroker({ ...ROW, tenure_hours: null })?.tenureHours).toBe(0)
  })

  it("rejects an unknown desk", () => {
    expect(rowToBroker({ ...ROW, desk: "crypto" as never })).toBeNull()
  })

  it("rejects a row with no id or name", () => {
    expect(rowToBroker({ ...ROW, id: "" })).toBeNull()
    expect(rowToBroker({ ...ROW, name: "" })).toBeNull()
  })

  it("rejects non-numeric stats", () => {
    expect(rowToBroker({ ...ROW, nerve: "high" as never })).toBeNull()
  })
})

describe("rosterSource", () => {
  it("is the fixture when Supabase is unconfigured", () => {
    expect(rosterSource()).toBe("fixture")
  })

  it("is supabase once configured", () => {
    mockConfigured.mockReturnValue(true)
    expect(rosterSource()).toBe("supabase")
  })
})

describe("fetchRoster", () => {
  it("returns the fixture when Supabase is unconfigured, without querying", async () => {
    const out = await fetchRoster()
    expect(out).toHaveLength(ROSTER.length)
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it("returns mapped rows when configured", async () => {
    mockConfigured.mockReturnValue(true)
    mockSelect.mockResolvedValue([ROW])
    const out = await fetchRoster()
    expect(out).toHaveLength(1)
    expect(out?.[0].name).toBe("MILO ASH")
  })

  it("drops malformed rows rather than rendering junk", async () => {
    mockConfigured.mockReturnValue(true)
    mockSelect.mockResolvedValue([ROW, { ...ROW, id: "PB-002", desk: "nope" }])
    expect(await fetchRoster()).toHaveLength(1)
  })

  it("returns null when a configured Supabase fails", async () => {
    // Falling back to the fixture here would misrepresent where the numbers
    // came from, so the caller has to surface the failure instead.
    mockConfigured.mockReturnValue(true)
    mockSelect.mockResolvedValue(null)
    expect(await fetchRoster()).toBeNull()
  })
})
