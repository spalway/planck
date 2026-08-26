import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { BrokerWall } from "@/components/broker-wall"
import type { Broker } from "@/lib/brokers"

function broker(id: string, name: string, desk: Broker["desk"]): Broker {
  return { id, name, desk, nerve: 40, latency: 50, coverage: 2, effectiveNerve: 40, tenureHours: 5 }
}

const BROKERS = [
  broker("PB-001", "MILO ASH", "equities"),
  broker("PB-002", "RENA BELL", "yield"),
  broker("PB-003", "OTIS MOSS", "credit"),
]

function wall(list: Broker[] = BROKERS) {
  return render(
    <MemoryRouter>
      <BrokerWall brokers={list} />
    </MemoryRouter>
  )
}

describe("BrokerWall", () => {
  it("shows every broker on the floor", () => {
    wall()
    expect(screen.getAllByTestId("wall-name")).toHaveLength(3)
  })

  it("renders a portrait for each", () => {
    const { container } = wall()
    expect(container.querySelectorAll('svg[role="img"]')).toHaveLength(3)
  })

  it("links each portrait through to the roster", () => {
    wall()
    const links = screen.getAllByRole("link", { name: /MILO ASH/ })
    expect(links[0]).toHaveAttribute("href", "/brokers")
  })

  it("explains the tie colour rather than leaving it as a puzzle", () => {
    wall()
    expect(screen.getByText(/tie colour is the desk/i)).toBeInTheDocument()
  })

  it("lists all five desks in the legend", () => {
    const { container } = wall()
    const legend = container.querySelector("div")!
    for (const d of ["EQUITIES", "INDEX", "BULLION", "YIELD", "CREDIT"]) {
      expect(within(legend).getByText(d)).toBeInTheDocument()
    }
  })

  it("survives an empty floor", () => {
    wall([])
    expect(screen.queryAllByTestId("wall-name")).toHaveLength(0)
  })
})
