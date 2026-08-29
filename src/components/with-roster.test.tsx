import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EmptyFloor } from "@/components/empty-floor"
import { WithRoster } from "@/components/with-roster"
import type { RosterState } from "@/hooks/use-roster"

const state = vi.hoisted(() => ({ current: null as RosterState | null }))

vi.mock("@/hooks/use-roster", () => ({
  useRoster: () => state.current,
}))

const renderWith = (s: RosterState) => {
  state.current = s
  return render(
    <MemoryRouter>
      <WithRoster>
        {(brokers) => <p>page rendered with {brokers.length} brokers</p>}
      </WithRoster>
    </MemoryRouter>
  )
}

describe("WithRoster", () => {
  beforeEach(() => {
    state.current = null
  })

  it("shows a loading line while the roster is in flight", () => {
    renderWith({ brokers: [], status: "loading" })
    expect(screen.getByText(/loading the floor/i)).toBeInTheDocument()
    expect(screen.queryByText(/page rendered/i)).toBeNull()
  })

  it("still renders the page when the roster fails", () => {
    // A paused database used to take the whole page down with it — no
    // wordmark, no contract address, no way to mint. This is the guard.
    renderWith({ brokers: [], status: "error" })
    expect(screen.getByText(/page rendered with 0 brokers/i)).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(/could not be loaded/i)
  })

  it("does not claim the floor is empty when it merely failed to load", () => {
    // "Be the first to mint" is a claim about the floor. It must not be made
    // when the truth is that we could not read the floor.
    renderWith({ brokers: [], status: "error" })
    expect(screen.queryByText(/be the first/i)).toBeNull()
  })

  it("renders the page with no banner once the roster is ready", () => {
    renderWith({ brokers: [], status: "ready" })
    expect(screen.getByText(/page rendered with 0 brokers/i)).toBeInTheDocument()
    expect(screen.queryByRole("status")).toBeNull()
  })
})

describe("EmptyFloor", () => {
  it("says the roster is empty and points at the mint", () => {
    render(
      <MemoryRouter>
        <EmptyFloor />
      </MemoryRouter>
    )
    expect(screen.getByText(/the roster is empty/i)).toBeInTheDocument()
    expect(screen.getByText(/be the first/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /mint your broker/i })).toHaveAttribute(
      "href",
      "/mint"
    )
  })
})
