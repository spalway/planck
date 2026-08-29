import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { BrokerWall } from "@/components/broker-wall"
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
        {(brokers, failed) => (
          <>
            <p>page rendered with {brokers.length} brokers</p>
            <span data-testid="failed">{String(failed)}</span>
          </>
        )}
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
  })

  it("tells the page the roster failed rather than merely being empty", () => {
    renderWith({ brokers: [], status: "error" })
    expect(screen.getByTestId("failed")).toHaveTextContent("true")
  })

  it("reports not-failed when the roster is genuinely empty", () => {
    renderWith({ brokers: [], status: "ready" })
    expect(screen.getByTestId("failed")).toHaveTextContent("false")
  })

  it("never puts a banner above the page", () => {
    // The failure is explained by the floor itself. A red bar across the top
    // made a recoverable outage look like a fault in the whole site.
    renderWith({ brokers: [], status: "error" })
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

  it("does not claim emptiness when the roster merely failed to load", () => {
    render(
      <MemoryRouter>
        <EmptyFloor failed />
      </MemoryRouter>
    )
    expect(screen.queryByText(/be the first/i)).toBeNull()
    expect(screen.queryByText(/the roster is empty/i)).toBeNull()
    expect(screen.getByText(/not loading/i)).toBeInTheDocument()
    // The way out is still offered — a failure must not be a dead end.
    expect(screen.getByRole("link", { name: /mint your broker/i })).toBeInTheDocument()
  })
})

describe("the wall a failed roster actually renders", () => {
  // The earlier version of this suite stubbed the child, so it never saw what
  // BrokerWall put on the page — and BrokerWall was saying "be the first"
  // on the failure path the whole time. Render the real thing.
  it("never says 'be the first' when the fetch failed", () => {
    render(
      <MemoryRouter>
        <BrokerWall brokers={[]} failed />
      </MemoryRouter>
    )
    expect(screen.queryByText(/be the first/i)).toBeNull()
  })

  it("does say it when the floor is genuinely empty", () => {
    render(
      <MemoryRouter>
        <BrokerWall brokers={[]} />
      </MemoryRouter>
    )
    expect(screen.getByText(/be the first/i)).toBeInTheDocument()
  })
})
