/**
 * Profile picture and X banner.
 *
 * Both are generated rather than drawn by hand so they cannot drift from the
 * site: the portrait is the same composed sprite the roster renders, the
 * logotype is the same drawn glyphs, and the palette is the same one
 * index.css defines.
 *
 *   npm run social
 *
 * Writes public/pfp.png (400x400) and public/banner.png (1500x500).
 *
 * The TypeScript modules are bundled first, because the art and the roster
 * live in src/ and node cannot import them directly.
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
const INK_MUTED = "#4a4038"
const UMBER = "#4a3728"

/** Who the profile picture is. Any broker on the roster works. */
const PFP_BROKER = "MARL FARRAR"

// ---------------------------------------------------------------------------
// Load the real art
// ---------------------------------------------------------------------------

const bundle = `${root}.social-bundle.mjs`

// Through a shell rather than execFileSync: npx resolves to npx.cmd on
// Windows, and spawning a .cmd directly is EINVAL on current Node.
//
// Vite 8 bundles with rolldown, so esbuild is not a local dependency — npx
// fetches it. Fine for a script run by hand a few times a year, and it avoids
// adding a bundler to the project for two images.
execSync(
  `npx esbuild src/lib/social-source.ts --bundle --format=esm ` +
    `--alias:@=./src --outfile="${bundle}" --log-level=error`,
  { cwd: root, stdio: "inherit" }
)

const {
  ROSTER,
  composeSprite,
  spritePalette,
  INSTRUMENTS,
  DESKS,
  WORDMARK_GLYPHS,
  WORDMARK_TEXT,
  WORDMARK_CELL,
} = await import(`file://${bundle.split("\\").join("/")}`)

rmSync(bundle, { force: true })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * SVG is XML, so a bare ampersand is a parse error, not a character.
 * "P&L" took the whole banner render down until this existed.
 */
function xml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/**
 * Brown tints for a one-colour portrait.
 *
 * A flat fill turned the brokers into featureless blobs — no eyes, no collar,
 * no tie. Mapping each glyph to a step on a single ramp keeps the art
 * readable while still being one colour, which is what a monochrome treatment
 * is supposed to mean. Darkest for the eyes, lightest for the shirt.
 */
const MONO = { w: 0.18, s: 0.34, t: 0.5, p: 0.5, m: 0.62, c: 0.78, h: 0.9, e: 1 }

/** One broker as rects. `mono` renders the ramp instead of the palette. */
function spriteRects(broker, { x, y, cell, mono = false, hue = UMBER }) {
  const rows = composeSprite(broker)
  const palette = spritePalette(broker)
  const out = []

  rows.forEach((row, ry) => {
    ;[...row].forEach((ch, rx) => {
      if (ch === ".") return
      const attrs = mono
        ? `fill="${hue}" opacity="${MONO[ch] ?? 0.6}"`
        : `fill="${palette[ch]}"`
      out.push(
        `<rect x="${x + rx * cell}" y="${y + ry * cell}" ` +
          `width="${cell}" height="${cell}" ${attrs}/>`
      )
    })
  })

  return out.join("")
}

/** The logotype, in the same drawn glyphs the site uses. */
function wordmarkRects({ x, y, cell, fill }) {
  const { GAP } = WORDMARK_CELL
  const out = []
  let x0 = 0

  for (const ch of WORDMARK_TEXT) {
    const glyph = WORDMARK_GLYPHS[ch]
    if (!glyph) continue

    glyph.forEach((row, ry) => {
      ;[...row].forEach((c, rx) => {
        if (c !== "#") return
        out.push(
          `<rect x="${x + (x0 + rx) * cell}" y="${y + ry * cell}" ` +
            `width="${cell}" height="${cell}" fill="${fill}"/>`
        )
      })
    })

    x0 += glyph[0].length + GAP
  }

  return out.join("")
}

/** Rendered width of the wordmark at a given cell size. */
function wordmarkWidth(cell) {
  const { GAP } = WORDMARK_CELL
  const cols =
    [...WORDMARK_TEXT].reduce((n, ch) => n + (WORDMARK_GLYPHS[ch]?.[0].length ?? 0), 0) +
    GAP * (WORDMARK_TEXT.length - 1)
  return cols * cell
}

/**
 * The site's graph paper: 1px rules on a fixed grid.
 *
 * This is the checker the page itself sits on, at the same weight, so the
 * banner reads as the same surface rather than a different design that
 * happens to share colours.
 */
function checker({ id, size = 16, color = UMBER, opacity = 0.07 }) {
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
    <rect width="${size}" height="1" fill="${color}" opacity="${opacity}"/>
    <rect width="1" height="${size}" fill="${color}" opacity="${opacity}"/>
  </pattern>`
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
  const offset = (SIZE - 16 * CELL) / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="crispEdges">
  <defs>${checker({ id: "pfpgrid", size: 16, opacity: 0.06 })}</defs>
  <rect width="${SIZE}" height="${SIZE}" fill="${TAN}"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#pfpgrid)"/>
  ${spriteRects(broker, { x: offset, y: offset, cell: CELL })}
</svg>`
}

// ---------------------------------------------------------------------------
// Banner — 1500x500
// ---------------------------------------------------------------------------

/**
 * The formulas the site actually computes. Every one is real arithmetic from
 * src/lib, not decoration.
 */
const FORMULAS = [
  "effective_nerve = min(100, nerve + max(0, coverage − depth))",
  "return = (price × qty − basis) ÷ basis",
  "P&L = Σ(qᵢ · pᵢ) − Σ bᵢ",
  "desk_odds = √depth ÷ Σ√depth",
]

/**
 * A bar chart of instrument depth per desk.
 *
 * Real data: the same weighting a mint rolls against, so the tallest bar is
 * genuinely the deepest desk.
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
          ? `<text class="m" x="${mid}" y="${y + h - bh + 15}" font-size="12" fill="${GROUND}" text-anchor="middle">${depth}</text>`
          : `<text class="m" x="${mid}" y="${y + h - bh - 6}" font-size="12" fill="${INK}" text-anchor="middle">${depth}</text>`

        return (
          `<rect x="${bx}" y="${y + h - bh}" width="${bw}" height="${bh}" fill="${UMBER}"/>` +
          value +
          `<text class="m" x="${mid}" y="${y + h + 18}" font-size="10" fill="${INK_MUTED}" text-anchor="middle" letter-spacing="1">${xml(DESKS[i].id.slice(0, 3))}</text>`
        )
      })
      .join("") +
    `<rect x="${x}" y="${y + h}" width="${w}" height="2" fill="${INK}"/>` +
    `<text class="m" x="${x}" y="${y - 14}" font-size="11" fill="${INK_MUTED}" letter-spacing="2">instruments per desk</text>`
  )
}

/**
 * 1500x500 on the site's own ground.
 *
 * Bone paper and the same graph-paper grid the page sits on, black type, and
 * the dark brown bar across the top — the banner is the site, not a separate
 * piece of art that shares its colours.
 *
 * X crops a banner top and bottom on narrow viewports and overlays the avatar
 * bottom-left, so nothing load-bearing sits below y=420 or in the first 220px
 * of the bottom-left corner.
 */
function banner(brokers) {
  const W = 1500
  const H = 500
  const BAR_H = 84

  const COL1 = 56 // wordmark, claim, formulas
  // Placed off the actual text measure, not by eye. The subline is the
  // widest thing in column one: 83 characters at 14px monospace is ~700px,
  // so anything at x=700 sits underneath it.
  const COL2 = 770 // desk chart
  const COL3 = 1030 // portraits

  const MARK_CELL = 7
  const markW = wordmarkWidth(MARK_CELL)

  const sprites = brokers
    .map((b, i) =>
      spriteRects(b, { x: COL3 + i * 116, y: 238, cell: 6, mono: true, hue: UMBER })
    )
    .join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>${FONT_CSS}</style>
    ${checker({ id: "grid", size: 16, opacity: 0.08 })}
  </defs>

  <rect width="${W}" height="${H}" fill="${GROUND}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>

  <!-- the site's header bar -->
  <rect width="${W}" height="${BAR_H}" fill="${BAR}"/>
  <rect y="${BAR_H}" width="${W}" height="3" fill="${INK}"/>
  <text class="m" x="${COL1}" y="52" font-size="15" fill="${TAN}" opacity="0.8" letter-spacing="4">solana · real-world assets</text>
  <text class="m" x="${W - 56}" y="52" font-size="15" fill="${TAN}" opacity="0.8" letter-spacing="3" text-anchor="end">@planckbits</text>

  <!-- the logotype, drawn in the site's own glyphs -->
  ${wordmarkRects({ x: COL1, y: 140, cell: MARK_CELL, fill: INK })}

  <!-- the claim -->
  <text class="m" x="${COL1}" y="252" font-size="19" font-weight="700" fill="${INK}">a labor market for ai broker agents</text>
  <text class="m" x="${COL1}" y="280" font-size="14" fill="${INK_MUTED}">mint a broker · he takes a desk · the vault buys the real asset · and never sells it</text>

  <!-- formulas: arithmetic the site actually runs -->
  ${FORMULAS.map(
    (f, i) =>
      `<text class="m" x="${COL1}" y="${318 + i * 25}" font-size="14" fill="${INK_MUTED}">${xml(f)}</text>`
  ).join("")}

  <!-- one-colour desk depth chart -->
  ${deskChart({ x: COL2, y: 246, w: 250, h: 88 })}

  <!-- portraits on a single brown ramp -->
  ${sprites}

  <!-- lower band, kept above X's crop line -->
  <rect x="${COL1}" y="416" width="${W - COL1 * 2}" height="2" fill="${INK}" opacity="0.18"/>
  <text class="m" x="${COL1}" y="442" font-size="13" fill="${INK_MUTED}">${INSTRUMENTS.length} tokenized instruments · ${DESKS.length} desks · live prices from jupiter · holdings verifiable on chain</text>
</svg>`
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const face =
  ROSTER.find((b) => b.name === PFP_BROKER) ??
  (() => {
    throw new Error(
      `${PFP_BROKER} is not on the roster. Names come from src/lib/brokers.ts.`
    )
  })()

const cast = ROSTER.filter((b) => b.id !== face.id).slice(0, 4)

async function write(name, svg) {
  const out = `${root}public/${name}`
  await sharp(Buffer.from(svg)).png().toFile(out)
  writeFileSync(`${root}public/${name.replace(".png", ".svg")}`, svg)
  const m = await sharp(out).metadata()
  console.log(`${name} written — ${m.width}x${m.height}`)
}

await write("pfp.png", profilePicture(face))
await write("banner.png", banner(cast))

console.log(`portrait: ${face.name} (${face.desk} desk, ${face.id})`)
