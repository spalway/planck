import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { BrokerShowcase } from "@/components/broker-showcase"
import type { Broker } from "@/lib/brokers"

function broker(id: string, name: string, over: Partial<Broker> = {}): Broker {
  return {
    id, name, desk: "equities", nerve: 40, latency: 50,
    coverage: 2, effectiveNerve: 40, tenureHours: 10, ...over,
  }
}

const BROKERS = [
  broker("PB-001", "MILO ASH"),
  broker("PB-002", "RENA BELL", { desk: "yield" }),
]

function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: reduced,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

beforeEach(() => {
  vi.useFakeTimers()
  mockReducedMotion(false)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("BrokerShowcase", () => {
  it("shows the first broker", () => {
    render(<BrokerShowcase brokers={BROKERS} />)
    expect(screen.getByText("MILO ASH")).toBeInTheDocument()
  })

  it("cycles to the next broker", () => {
    render(<BrokerShowcase brokers={BROKERS} />)
    act(() => void vi.advanceTimersByTime(2600))
    expect(screen.getByText("RENA BELL")).toBeInTheDocument()
  })

  it("wraps around rather than running off the end", () => {
    render(<BrokerShowcase brokers={BROKERS} />)
    act(() => void vi.advanceTimersByTime(2600 * 2))
    expect(screen.getByText("MILO ASH")).toBeInTheDocument()
  })

  it("holds still when the viewer asked for reduced motion", () => {
    mockReducedMotion(true)
    render(<BrokerShowcase brokers={BROKERS} />)
    act(() => void vi.advanceTimersByTime(2600 * 3))
    expect(screen.getByText("MILO ASH")).toBeInTheDocument()
  })

  it("does not cycle a roster of one", () => {
    render(<BrokerShowcase brokers={[BROKERS[0]]} />)
    act(() => void vi.advanceTimersByTime(2600 * 3))
    expect(screen.getByText("MILO ASH")).toBeInTheDocument()
  })

  it("renders nothing for an empty floor", () => {
    const { container } = render(<BrokerShowcase brokers={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("names the desk alongside the portrait", () => {
    render(<BrokerShowcase brokers={[BROKERS[1]]} />)
    expect(screen.getByText(/YIELD/)).toBeInTheDocument()
  })
})
