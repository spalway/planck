import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BrokerSprite } from "@/components/broker-sprite"
import type { Broker } from "@/lib/brokers"

/**
 * Grid-shape assertions (width, symmetry, glyph set) live in
 * sprite-base.test.ts and sprite-layers.test.ts, next to the data they
 * constrain. This file covers only what the component adds.
 */

const BROKER: Broker = {
  id: "PB-001",
  name: "MILO ASH",
  desk: "equities",
  tier: "common",
  nerve: 40,
  latency: 50,
  coverage: 2,
  effectiveNerve: 40,
  tenureHours: 100,
}

describe("BrokerSprite", () => {
  it("renders an svg labelled with the broker name", () => {
    const { container } = render(<BrokerSprite broker={BROKER} />)
    expect(container.querySelector("svg")?.getAttribute("aria-label")).toContain(
      "MILO ASH"
    )
  })

  it("uses a 24-unit viewBox so pixels stay square", () => {
    const { container } = render(<BrokerSprite broker={BROKER} />)
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 24 24")
  })

  it("paints no ground, so the portrait is a cutout", () => {
    // Every rect is one pixel. A full-bleed 24x24 rect would be a background
    // square, which read as a sticker pasted onto the panel behind it.
    const { container } = render(<BrokerSprite broker={BROKER} />)
    const rects = [...container.querySelectorAll("svg rect")]
    expect(rects.length).toBeGreaterThan(0)
    for (const r of rects) {
      expect(r.getAttribute("width")).toBe("1")
      expect(r.getAttribute("height")).toBe("1")
    }
  })

  it("is deterministic — the same broker yields identical markup", () => {
    const a = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const b = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    expect(a).toBe(b)
  })

  it("differs between desks, so the outfit reads the desk", () => {
    const a = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const b = render(<BrokerSprite broker={{ ...BROKER, desk: "bullion" }} />).container
      .innerHTML
    expect(a).not.toBe(b)
  })

  it("differs between tiers, so scarcity reads at a glance", () => {
    const a = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const b = render(<BrokerSprite broker={{ ...BROKER, tier: "legendary" }} />).container
      .innerHTML
    expect(a).not.toBe(b)
  })

  it("gives different brokers different faces", () => {
    // One palette for all 24 read as the same person duplicated.
    const a = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const b = render(<BrokerSprite broker={{ ...BROKER, id: "PB-017" }} />).container
      .innerHTML
    expect(a).not.toBe(b)
  })

  it("adds a hat for high nerve", () => {
    const plain = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const hatted = render(<BrokerSprite broker={{ ...BROKER, effectiveNerve: 85 }} />)
      .container.innerHTML
    expect(hatted).not.toBe(plain)
  })

  it("adds a headset for low latency", () => {
    const plain = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const wired = render(<BrokerSprite broker={{ ...BROKER, latency: 10 }} />).container
      .innerHTML
    expect(wired).not.toBe(plain)
  })
})
