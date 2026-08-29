/**
 * The broker portrait as an indexed PNG.
 *
 * This exists because of Solana, not because of the browser. The mint
 * transaction carries the rendered portrait as base64 in an SPL Memo, and the
 * program hashes it — so the image has to fit, and the encoding has to be
 * byte-identical everywhere or the stored hash stops matching.
 *
 * Budget: a transaction is capped at 1232 bytes, and an unsigned memo at
 * roughly 566 characters of single-byte UTF-8 at the default compute budget.
 * MEMO_BUDGET is 420, which leaves real margin under that ceiling.
 *
 * 4-bit indexed with a palette, deflated through CompressionStream — which is
 * zlib-wrapped, exactly what IDAT wants, and present in browsers and Node 18+.
 * No dependency, and the same bytes on both sides.
 *
 * An uncompressed ("stored") deflate was tried first and is not viable: the
 * 312-byte raw scanline block lands around 468 bytes of PNG, or 624 base64
 * characters, which is over the memo ceiling on its own.
 */

import type { Broker } from "@/lib/brokers"
import { SPRITE_SIZE } from "@/lib/sprite-base"
import { composeSprite, spriteGround, spritePalette } from "@/lib/sprite-compose"

/** Maximum base64 length. Below the ~566 SPL Memo ceiling, with margin. */
export const MEMO_BUDGET = 420

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  // The CRC covers the type and the data, not the length.
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

// Uint8Array<ArrayBuffer>, not bare Uint8Array: the bare form widens to
// ArrayBufferLike, which is not a BufferSource, and the writer rejects it.
async function deflate(raw: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate")
  const writer = cs.writable.getWriter()
  void writer.write(raw)
  void writer.close()
  return new Uint8Array(await new Response(cs.readable).arrayBuffer())
}

function rgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

export async function encodePng(
  rows: readonly string[],
  palette: Record<string, string>,
  ground: string
): Promise<Uint8Array> {
  // Index colours in first-seen order. "." takes the ground.
  const index = new Map<string, number>()
  const table: string[] = []
  const colourOf = (ch: string) => (ch === "." ? ground : palette[ch])
  for (const row of rows) {
    for (const ch of row) {
      const hex = colourOf(ch)
      if (!index.has(hex)) {
        index.set(hex, table.length)
        table.push(hex)
      }
    }
  }
  if (table.length > 16) {
    throw new Error(`${table.length} colours — a 4-bit indexed PNG holds 16`)
  }

  // 4bpp: two pixels per byte, one filter byte (0 = None) per scanline.
  const stride = SPRITE_SIZE / 2
  const raw = new Uint8Array(SPRITE_SIZE * (stride + 1))
  let p = 0
  for (let y = 0; y < SPRITE_SIZE; y++) {
    raw[p++] = 0
    for (let x = 0; x < SPRITE_SIZE; x += 2) {
      const hi = index.get(colourOf(rows[y][x]))!
      const lo = index.get(colourOf(rows[y][x + 1]))!
      raw[p++] = (hi << 4) | lo
    }
  }

  const ihdr = new Uint8Array(13)
  const hv = new DataView(ihdr.buffer)
  hv.setUint32(0, SPRITE_SIZE)
  hv.setUint32(4, SPRITE_SIZE)
  ihdr[8] = 4 // bit depth
  ihdr[9] = 3 // colour type: indexed
  // 10..12 stay zero: deflate, adaptive filtering, no interlace.

  const plte = new Uint8Array(table.length * 3)
  table.forEach((hex, i) => {
    const [r, g, b] = rgb(hex)
    plte[i * 3] = r
    plte[i * 3 + 1] = g
    plte[i * 3 + 2] = b
  })

  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("PLTE", plte),
    chunk("IDAT", await deflate(raw)),
    chunk("IEND", new Uint8Array(0)),
  ]

  const png = new Uint8Array(parts.reduce((a, c) => a + c.length, 0))
  let o = 0
  for (const part of parts) {
    png.set(part, o)
    o += part.length
  }
  return png
}

function toBase64(bytes: Uint8Array): string {
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

/** The portrait as base64, exactly as it goes into the memo. */
export async function spritePngBase64(b: Broker): Promise<string> {
  const png = await encodePng(composeSprite(b), spritePalette(b), spriteGround(b))
  return toBase64(png)
}
