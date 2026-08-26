/**
 * Profile picture and X banner.
 *
 * Both are generated rather than drawn by hand so they cannot drift from the
 * site: the portrait is the same composed sprite the roster renders, via
 * lib/sprite-compose.ts, and the palette is the same one index.css defines.
 *
 *   node scripts/make-social.mjs
 *
 * Writes public/pfp.png (400x400) and public/banner.png (1500x500).
 *
 * The TypeScript modules are bundled through esbuild first, because the art
 * and the roster live in src/ and node cannot import them directly.
 */

import { execSync } from "node:child_process"
import { readFileSync, rmSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const root = fileURLToPath(new URL("..", import.meta.url))

// ---------------------------------------------------------------------------
// Palette — the same values as src/index.css
// ---------------------------------------------------------------------------

const BAR = "#3b2a1d"
const BAR_DEEP = "#2b1e14"
const TAN = "#ded1ba"
const GROUND = "#efe9dc"
const INK = "#000000"

// ---------------------------------------------------------------------------
// Load the real art
// ---------------------------------------------------------------------------

const bundle = `${root}.social-bundle.mjs`

// Through a shell rather than execFileSync: npx resolves to npx.cmd on
// Windows, and spawning a .cmd directly is EINVAL on current Node.
//
// Vite 8 bundles with rolldown, so esbuild is not a local dependency — npx
// fetches it. That is fine for a script run by hand a few times a year, and
// avoids adding a bundler to the project for two images.
execSync(
  `npx esbuild src/lib/social-source.ts --bundle --format=esm ` +
    `--alias:@=./src --outfile="${bundle}" --log-level=error`,
  { cwd: root, stdio: "inherit" }
)

const { ROSTER, composeSprite, spritePalette, INSTRUMENTS, DESKS } = await import(
  `file://${bundle.split("\\").join("/")}`
)

rmSync(bundle, { force: true })

// ---------------------------------------------------------------------------
// Sprite rendering
// ---------------------------------------------------------------------------

/**
 * One broker as rects.
 *
 * `mono` collapses every glyph to a single colour, which is how the banner
 * gets the flat one-colour silhouettes without a second set of art.
 */
/**
 * Tan tints for a one-colour portrait.
 *
 * A flat fill turned the brokers into featureless blobs — no eyes, no
 * collar, no tie. Mapping each glyph to a step on a single tan ramp keeps
 * the art readable while still being one colour, which is what a monochrome
 * treatment is supposed to mean.
 */
const MONO = { e: 0.22, h: 0.34, c: 0.48, m: 0.58, t: 0.72, p: 0.72, s: 0.88, w: 1 }

/**
 * One broker as rects.  renders the tan ramp instead of the palette.
 */
function spriteRects(broker, { x, y, cell, mono = false }) {
  const rows = composeSprite(broker)
  const palette = spritePalette(broker)
  const out = []

  rows.forEach((row, ry) => {
    ;[...row].forEach((ch, rx) => {
      if (ch === ".") return
      const attrs = mono
        ? `fill="${TAN}" opacity="${MONO[ch] ?? 0.6}"`
        : `fill="${palette[ch]}"`
      out.push(
        `<rect x="${x + rx * cell}" y="${y + ry * cell}" ` +
          `width="${cell}" height="${cell}" ${attrs}/>`
      )
    })
  })

  return out.join("")
}

// ---------------------------------------------------------------------------
// Font — embedded so rendering does not depend on what is installed
// ---------------------------------------------------------------------------

const fontFile = `${root}node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2`
const fontData = `data:font/woff2;base64,${readFileSync(fontFile).toString("base64")}`

const FONT_CSS = `
  @font-face { font-family: "Geist Mono"; src: url("${fontData}") format("woff2"); }
  .m { font-family: "Geist Mono", monospace; }
`

// ---------------------------------------------------------------------------
// Profile picture — 400x400
// ---------------------------------------------------------------------------

/**
 * The portrait sits on tan with a wide margin on every side.
 *
 * X crops a profile picture to a circle, so anything near a corner is lost.
 * A 16-cell sprite at 16px per cell is 256px inside a 400px square, which
 * leaves 72px of tan all round — inside the circle everywhere, and the tan
 * still reads as a deliberate ground rather than a tight crop.
 */
function profilePicture(broker) {
  const SIZE = 400
  const CELL = 16
  const art = 16 * CELL
  const offset = (SIZE - art) / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="crispEdges">
  <rect width="${SIZE}" height="${SIZE}" fill="${TAN}"/>
  ${spriteRects(broker, { x: offset, y: offset, cell: CELL })}
</svg>`
}

// ---------------------------------------------------------------------------
// Banner — 1500x500
// ---------------------------------------------------------------------------

/**
 * SVG is XML, so a bare ampersand is a parse error, not a character.
 * "P&L" took the whole banner down until this existed.
 */
function xml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/**
 * The formulas the site actually computes. Every one of these is real
 * arithmetic from src/lib, not decoration.
 */
const FORMULAS = [
  "effective_nerve = min(100, nerve + max(0, coverage − depth))",
  "return = (price × qty − basis) ÷ basis",
  "P&L = Σ(qᵢ · pᵢ) − Σ bᵢ",
  "desk_odds = √depth ÷ Σ√depth",
]

/** A sparse pixel field, deterministic so the banner regenerates identically. */
function pixelField({ x, y, w, h, cell, seed }) {
  let a = seed
  const rand = () => {
    a = (a * 1664525 + 1013904223) >>> 0
    return a / 4294967296
  }

  const out = []
  for (let cy = 0; cy < h / cell; cy++) {
    for (let cx = 0; cx < w / cell; cx++) {
      const r = rand()
      if (r > 0.055) continue
      // Texture, not confetti. The first pass sat at 14% coverage and up to
      // 34% opacity, which competed with the formulas instead of sitting behind them.
      const alpha = r > 0.035 ? 0.05 : r > 0.018 ? 0.09 : 0.14
      out.push(
        `<rect x="${x + cx * cell}" y="${y + cy * cell}" width="${cell}" height="${cell}" fill="${TAN}" opacity="${alpha}"/>`
      )
    }
  }
  return out.join("")
}

/**
 * A flat tan bar chart — one bar per desk, height by instrument depth.
 *
 * Real data: it is the same weighting the mint rolls against, so the tallest
 * bar is genuinely the deepest desk.
 *
 * Labels are centred under their bar and abbreviated, because five full desk
 * names at 11px do not fit in 250px and were overlapping into each other.
 */
function deskChart({ x, y, w, h }) {
  const depths = DESKS.map((d) => INSTRUMENTS.filter((i) => i.desk === d.id).length)
  const max = Math.max(...depths)
  const slot = w / depths.length
  const bw = Math.round(slot * 0.6)

  return (
    depths
      .map((depth, i) => {
        const bh = Math.max(3, Math.round((depth / max) * h))
        const bx = Math.round(x + i * slot)
        const mid = bx + bw / 2

        // Inside the bar when there is room, above it when there is not.
        // Always above, the tallest bar's label ran into the chart title.
        const roomy = bh >= 22
        const value = roomy
          ? `<text class="m" x="${mid}" y="${y + h - bh + 15}" font-size="12" fill="${BAR_DEEP}" text-anchor="middle">${depth}</text>`
          : `<text class="m" x="${mid}" y="${y + h - bh - 6}" font-size="12" fill="${TAN}" opacity="0.85" text-anchor="middle">${depth}</text>`

        return (
          `<rect x="${bx}" y="${y + h - bh}" width="${bw}" height="${bh}" fill="${TAN}" opacity="0.8"/>` +
          value +
          `<text class="m" x="${mid}" y="${y + h + 18}" font-size="10" fill="${TAN}" opacity="0.5" text-anchor="middle" letter-spacing="1">${xml(DESKS[i].id.slice(0, 3))}</text>`
        )
      })
      .join("") +
    `<rect x="${x}" y="${y + h}" width="${w}" height="1" fill="${TAN}" opacity="0.3"/>` +
    `<text class="m" x="${x}" y="${y - 12}" font-size="11" fill="${TAN}" opacity="0.5" letter-spacing="2">instruments per desk</text>`
  )
}

/**
 * 1500x500, in three columns.
 *
 * The first pass put the desk chart at x=620 while the longest formula ran to
 * x=613 at 16px monospace, so they collided. The columns below are placed off
 * the actual text measure — 58 characters at ~0.6em — rather than by eye.
 *
 * X crops a banner top and bottom on narrow viewports and overlays the avatar
 * bottom-left, so nothing load-bearing sits below y=420 or in the first 200px
 * of the bottom-left corner.
 */
function banner(brokers) {
  const W = 1500
  const H = 500
  const BAR_H = 96

  const COL1 = 56 // formulas and the claim
  const COL2 = 700 // desk chart — clear of the longest formula
  const COL3 = 1000 // portraits

  const sprites = brokers
    .map((b, i) => spriteRects(b, { x: COL3 + i * 122, y: 246, cell: 6, mono: true }))
    .join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><style>${FONT_CSS}</style></defs>

  <rect width="${W}" height="${H}" fill="${BAR}"/>

  ${pixelField({ x: 0, y: BAR_H, w: W, h: H - BAR_H, cell: 10, seed: 0x504c4b })}

  <!-- header bar -->
  <rect width="${W}" height="${BAR_H}" fill="${BAR_DEEP}"/>
  <rect y="${BAR_H - 3}" width="${W}" height="3" fill="${TAN}"/>
  <text class="m" x="${COL1}" y="60" font-size="38" font-weight="800" fill="${GROUND}" letter-spacing="1">planckbits</text>
  <text class="m" x="330" y="59" font-size="15" fill="${TAN}" opacity="0.7" letter-spacing="4">solana · real-world assets</text>
  <text class="m" x="${W - 56}" y="59" font-size="15" fill="${TAN}" opacity="0.7" letter-spacing="3" text-anchor="end">@planckbits</text>

  <!-- the claim -->
  <text class="m" x="${COL1}" y="180" font-size="31" font-weight="700" fill="${GROUND}">a labor market for ai broker agents</text>
  <text class="m" x="${COL1}" y="214" font-size="15" fill="${TAN}" opacity="0.72">mint a broker · he takes a desk · the vault buys the real asset · and never sells it</text>

  <!-- formulas: every one of these is arithmetic the site actually runs -->
  ${FORMULAS.map(
    (f, i) =>
      `<text class="m" x="${COL1}" y="${278 + i * 32}" font-size="15" fill="${TAN}" opacity="${0.85 - i * 0.06}">${xml(f)}</text>`
  ).join("")}

  <!-- one-colour desk depth chart -->
  ${deskChart({ x: COL2, y: 254, w: 250, h: 88 })}

  <!-- portraits on a single tan ramp -->
  ${sprites}

  <!-- lower band, kept above X's crop line -->
  <rect x="${COL1}" y="404" width="${W - COL1 * 2}" height="2" fill="${TAN}" opacity="0.22"/>
  <text class="m" x="${COL1}" y="432" font-size="13" fill="${TAN}" opacity="0.5">${INSTRUMENTS.length} tokenized instruments · ${DESKS.length} desks · live prices from jupiter · holdings verifiable on chain</text>
</svg>`
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/**
 * A hatted, headsetted broker reads best at profile size — the silhouette is
 * distinctive rather than a plain head and shoulders.
 */
const face =
  ROSTER.find((b) => b.effectiveNerve >= 70 && b.latency <= 30) ??
  ROSTER.find((b) => b.effectiveNerve >= 70) ??
  ROSTER[0]

const cast = ROSTER.filter((b) => b.id !== face.id).slice(0, 4)

async function write(name, svg) {
  const out = `${root}public/${name}`
  await sharp(Buffer.from(svg)).png().toFile(out)
  writeFileSync(`${root}public/${name.replace(".png", ".svg")}`, svg)
  const { size } = await sharp(out).metadata().then(async (m) => ({
    size: m.width + "x" + m.height,
  }))
  console.log(`${name} written — ${size}`)
}

await write("pfp.png", profilePicture(face))
await write("banner.png", banner(cast))

console.log(`portrait: ${face.name} (${face.desk})`)
