import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Roster } from "@/components/roster"
import type { Broker } from "@/lib/brokers"

const BROKERS: Broker[] = [
  {
    id: "PB-001",
    name: "MILO ASH",
    desk: "equities",
    nerve: 40,
    latency: 90,
    coverage: 2,
    effectiveNerve: 40,
    tenureHours: 10,
  },
  {
    id: "PB-002",
    name: "RENA BELL",
    desk: "yield",
    nerve: 90,
    latency: 5,
    coverage: 5,
    effectiveNerve: 94,
    tenureHours: 900,
  },
  {
    id: "PB-003",
    name: "OTIS MOSS",
    desk: "credit",
    nerve: 60,
    latency: 50,
    coverage: 1,
    effectiveNerve: 60,
    tenureHours: 400,
  },
]

function names() {
  return screen.getAllByTestId("broker-name").map((n) => n.textContent)
}

describe("Roster", () => {
  it("renders every broker", () => {
    render(<Roster brokers={BROKERS} />)
    expect(names()).toHaveLength(3)
  })

  it("sorts by tenure descending by default", () => {
    render(<Roster brokers={BROKERS} />)
    expect(names()).toEqual(["RENA BELL", "OTIS MOSS", "MILO ASH"])
  })

  it("sorts by nerve descending when asked", () => {
    render(<Roster brokers={BROKERS} />)
    fireEvent.click(screen.getByRole("button", { name: /nerve/i }))
    expect(names()[0]).toBe("RENA BELL")
  })

  it("sorts by latency ascending, because lower is better", () => {
    render(<Roster brokers={BROKERS} />)
    fireEvent.click(screen.getByRole("button", { name: /latency/i }))
    expect(names()).toEqual(["RENA BELL", "OTIS MOSS", "MILO ASH"])
  })

  it("filters to one desk", () => {
    render(<Roster brokers={BROKERS} />)
    fireEvent.click(screen.getByRole("button", { name: "YIELD" }))
    expect(names()).toEqual(["RENA BELL"])
  })

  it("shows effective nerve, not the raw roll, so the overflow rule is visible", () => {
    render(<Roster brokers={[BROKERS[1]]} />)
    const card = screen.getByTestId("broker-card-PB-002")
    expect(within(card).getByText("94")).toBeInTheDocument()
  })

  it("renders hire as a disabled pre-launch action", () => {
    render(<Roster brokers={[BROKERS[0]]} />)
    expect(screen.getByRole("button", { name: /hire/i })).toBeDisabled()
  })

  it("says so plainly when a filter matches nothing", () => {
    render(<Roster brokers={[BROKERS[0]]} />)
    fireEvent.click(screen.getByRole("button", { name: "BULLION" }))
    expect(screen.getByText(/no brokers/i)).toBeInTheDocument()
  })
})
