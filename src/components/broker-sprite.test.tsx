import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BrokerSprite } from "@/components/broker-sprite"
import type { Broker } from "@/lib/brokers"

const BROKER: Broker = {
  id: "PB-001", name: "MILO ASH", desk: "equities",
  nerve: 40, latency: 10, coverage: 2, effectiveNerve: 40, tenureHours: 100,
}

describe("BrokerSprite", () => {
  it("renders an svg labelled with the broker name", () => {
    const { container } = render(<BrokerSprite broker={BROKER} />)
    const svg = container.querySelector("svg")
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute("aria-label")).toContain("MILO ASH")
  })

  it("is deterministic — the same broker yields identical markup", () => {
    const a = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const b = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    expect(a).toBe(b)
  })

  it("differs between desks, so the floor is visually legible", () => {
    const a = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const b = render(
      <BrokerSprite broker={{ ...BROKER, desk: "bullion" }} />
    ).container.innerHTML
    expect(a).not.toBe(b)
  })

  it("uses a 12-unit viewBox so pixels stay square", () => {
    const { container } = render(<BrokerSprite broker={BROKER} />)
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 12 12")
  })
})
