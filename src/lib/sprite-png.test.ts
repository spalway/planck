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
    // 900 combinations, each spinning up its own CompressionStream. It lands
    // around 5s, which is the default timeout — so it gets an explicit one
    // rather than a sampled loop. Exhaustive is the point of this test.
  }, 30_000)

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

  it("leaves the background transparent rather than painting a ground", async () => {
    // A flat square behind the chimp read as a sticker pasted onto the panel.
    // The portrait has to be a cutout, which for an indexed PNG means a tRNS
    // chunk — not a background colour that happens to match today's theme.
    const sharp = (await import("sharp")).default
    const buf = Buffer.from(await spritePngBase64(ROSTER[0]), "base64")

    expect((await sharp(buf).metadata()).hasAlpha, "no tRNS chunk").toBe(true)

    const { data, info } = await sharp(buf)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    expect(info.channels).toBe(4)
    // Top-left corner is outside the silhouette on every broker.
    expect(data[3], "corner pixel is opaque").toBe(0)
    // ...and the chimp itself is still there.
    const centre = (12 * 24 + 12) * 4
    expect(data[centre + 3], "centre pixel is transparent").toBe(255)
  })

  it("keeps every drawn pixel opaque, so only the ground drops out", async () => {
    const sharp = (await import("sharp")).default
    const rows = (await import("@/lib/sprite-compose")).composeSprite(ROSTER[0])
    const buf = Buffer.from(await spritePngBase64(ROSTER[0]), "base64")
    const { data } = await sharp(buf).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    })

    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        const alpha = data[(y * 24 + x) * 4 + 3]
        expect(alpha, `${x},${y} glyph "${rows[y][x]}"`).toBe(
          rows[y][x] === "." ? 0 : 255
        )
      }
    }
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
