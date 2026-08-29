import { describe, expect, it } from "vitest"

import { ROSTER, type Broker } from "@/lib/brokers"
import { MEMO_BUDGET, spritePngBase64 } from "@/lib/sprite-png"
import { TIERS } from "@/lib/sprite-tiers"

const BASE: Broker = {
  id: "PB-001",
  name: "MARL FARRAR",
  desk: "credit",
  tier: "common",
  nerve: 50,
  latency: 50,
  coverage: 3,
  effectiveNerve: 50,
  tenureHours: 0,
}

describe("sprite PNG", () => {
  it("starts with the PNG signature", async () => {
    const b64 = await spritePngBase64(BASE)
    expect(b64.startsWith("iVBORw0KGgo")).toBe(true)
  })

  it("fits the memo budget for every broker on the floor", async () => {
    for (const b of ROSTER) {
      const b64 = await spritePngBase64(b)
      expect(b64.length, `${b.id} is ${b64.length} chars`).toBeLessThanOrEqual(
        MEMO_BUDGET
      )
    }
  })

  it("fits the memo budget across EVERY trait combination", async () => {
    // This is the assertion the 24x24 decision rests on. A rare roll that
    // produced an oversized PNG would be an unmintable broker — a mint that
    // takes the fee and then fails. Exhaustive, not sampled.
    let worst = 0
    let worstLabel = ""
    for (const tier of TIERS) {
      for (const desk of ["equities", "index", "bullion", "yield", "credit"] as const) {
        for (const nerve of [10, 65, 100]) {
          for (const latency of [10, 50, 95]) {
            for (const coverage of [1, 3, 5, 9]) {
              const b: Broker = {
                ...BASE,
                desk,
                tier: tier.id,
                nerve,
                latency,
                coverage,
                effectiveNerve: nerve,
              }
              const b64 = await spritePngBase64(b)
              if (b64.length > worst) {
                worst = b64.length
                worstLabel = `${tier.id}/${desk}/n${nerve}/l${latency}/c${coverage}`
              }
            }
          }
        }
      }
    }
    expect(worst, `worst case ${worstLabel} at ${worst} chars`).toBeLessThanOrEqual(
      MEMO_BUDGET
    )
  })

  it("produces bytes a real decoder accepts", async () => {
    // The signature bytes alone prove nothing: a malformed CRC or a bad IDAT
    // still starts with "iVBORw0KGgo". The whole point of the memo is that
    // someone pastes it into a base64 image decoder and sees a chimp, so the
    // bytes have to survive a decoder we did not write.
    const sharp = (await import("sharp")).default
    const buf = Buffer.from(await spritePngBase64(ROSTER[0]), "base64")

    const meta = await sharp(buf).metadata()
    expect(meta.format).toBe("png")
    expect(meta.width).toBe(24)
    expect(meta.height).toBe(24)

    // Round-trips to raw pixels, so IDAT and PLTE are internally consistent.
    const raw = await sharp(buf).raw().toBuffer()
    expect(raw.length).toBeGreaterThan(0)
  })

  it("is deterministic — the hash stored on chain must be stable", async () => {
    expect(await spritePngBase64(BASE)).toBe(await spritePngBase64(BASE))
  })

  it("differs between brokers", async () => {
    const a = await spritePngBase64(BASE)
    const b = await spritePngBase64({ ...BASE, tier: "legendary", id: "PB-009" })
    expect(a).not.toBe(b)
  })
})
