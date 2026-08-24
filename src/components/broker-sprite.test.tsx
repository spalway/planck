import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  BrokerSprite,
  SPRITE_HAT,
  SPRITE_ROWS,
  SPRITE_SIZE,
} from "@/components/broker-sprite"
import type { Broker } from "@/lib/brokers"

const BROKER: Broker = {
  id: "PB-001", name: "MILO ASH", desk: "equities",
  nerve: 40, latency: 90, coverage: 2, effectiveNerve: 40, tenureHours: 100,
}

describe("sprite grid", () => {
  it("is square", () => {
    expect(SPRITE_ROWS).toHaveLength(SPRITE_SIZE)
  })

  it("has every row exactly the grid width", () => {
    // A single miscounted character skews every pixel after it on that row.
    SPRITE_ROWS.forEach((row, i) => {
      expect(row.length, `base row ${i}: "${row}"`).toBe(SPRITE_SIZE)
    })
    SPRITE_HAT.forEach((row, i) => {
      expect(row.length, `hat row ${i}: "${row}"`).toBe(SPRITE_SIZE)
    })
  })

  it("uses only declared glyphs", () => {
    const allowed = new Set([".", "h", "s", "e", "m", "c", "w", "t", "p"])
    for (const row of [...SPRITE_ROWS, ...SPRITE_HAT]) {
      for (const ch of row) expect(allowed.has(ch), `glyph "${ch}"`).toBe(true)
    }
  })
})

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

  it("differs between desks, so the tie reads the desk", () => {
    const a = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const b = render(
      <BrokerSprite broker={{ ...BROKER, desk: "bullion" }} />
    ).container.innerHTML
    expect(a).not.toBe(b)
  })

  it("gives different brokers different faces", () => {
    // One palette for all 24 read as the same person duplicated.
    const a = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const b = render(
      <BrokerSprite broker={{ ...BROKER, id: "PB-017" }} />
    ).container.innerHTML
    expect(a).not.toBe(b)
  })

  it("adds a hat for high nerve", () => {
    const plain = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const hatted = render(
      <BrokerSprite broker={{ ...BROKER, effectiveNerve: 85 }} />
    ).container.innerHTML
    expect(hatted).not.toBe(plain)
  })

  it("adds a headset for low latency", () => {
    const plain = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const wired = render(
      <BrokerSprite broker={{ ...BROKER, latency: 10 }} />
    ).container.innerHTML
    expect(wired).not.toBe(plain)
  })

  it("uses a 16-unit viewBox so pixels stay square", () => {
    const { container } = render(<BrokerSprite broker={BROKER} />)
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 16 16")
  })
})
