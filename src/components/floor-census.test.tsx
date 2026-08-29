import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FloorCensus } from "@/components/floor-census"
import type { Broker } from "@/lib/brokers"

const BROKERS: Broker[] = [
  {
    id: "a",
    name: "MILO ASH",
    desk: "equities",
    nerve: 40,
    latency: 10,
    coverage: 2,
    tier: "common",
    effectiveNerve: 40,
    tenureHours: 100,
  },
  {
    id: "b",
    name: "RENA BELL",
    desk: "yield",
    nerve: 50,
    latency: 20,
    coverage: 5,
    tier: "common",
    effectiveNerve: 54,
    tenureHours: 0,
  },
  {
    id: "c",
    name: "OTIS MOSS",
    desk: "credit",
    nerve: 60,
    latency: 30,
    coverage: 1,
    tier: "common",
    effectiveNerve: 60,
    tenureHours: 250,
  },
]

describe("FloorCensus", () => {
  it("counts the whole roster", () => {
    render(<FloorCensus brokers={BROKERS} />)
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("splits employed from idle by tenure", () => {
    render(<FloorCensus brokers={BROKERS} />)
    expect(screen.getByText("Employed")).toBeInTheDocument()
    expect(screen.getByText("Idle")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("reports how many desks are covered", () => {
    render(<FloorCensus brokers={BROKERS} />)
    expect(screen.getByText("Desks covered")).toBeInTheDocument()
    expect(screen.getByText("3 / 5")).toBeInTheDocument()
  })

  it("renders without crashing on an empty floor", () => {
    render(<FloorCensus brokers={[]} />)
    expect(screen.getByText("Brokers")).toBeInTheDocument()
  })
})
