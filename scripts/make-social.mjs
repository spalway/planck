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
import { rmSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const root = fileURLToPath(new URL("..", import.meta.url))

// ---------------------------------------------------------------------------
// Palette — the same values as src/index.css
// ---------------------------------------------------------------------------

const TAN = "#ded1ba"
const GROUND = "#efe9dc"
const INK = "#000000"
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
  WORDMARK_GLYPHS,
  WORDMARK_TEXT,
  WORDMARK_CELL,
} = await import(`file://${bundle.split("\\").join("/")}`)

rmSync(bundle, { force: true })

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/** One broker as rects, in the roster's own colours. */
function spriteRects(broker, { x, y, cell }) {
  const rows = composeSprite(broker)
  const palette = spritePalette(broker)
  const out = []

  rows.forEach((row, ry) => {
    ;[...row].forEach((ch, rx) => {
      if (ch === ".") return
      out.push(
        `<rect x="${x + rx * cell}" y="${y + ry * cell}" ` +
          `width="${cell}" height="${cell}" fill="${palette[ch]}"/>`
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

/** Rendered width of the whole wordmark at a given cell size. */
function wordmarkWidth(cell) {
  const { GAP } = WORDMARK_CELL
  const cols =
    [...WORDMARK_TEXT].reduce(
      (n, ch) => n + (WORDMARK_GLYPHS[ch]?.[0].length ?? 0),
      0
    ) +
    GAP * (WORDMARK_TEXT.length - 1)
  return cols * cell
}

/**
 * The site's graph paper: 1px rules on a fixed grid.
 *
 * The same checker the page sits on, so the banner reads as the same surface
 * rather than a separate design that happens to share a colour.
 */
function checker({ id, size = 16, color = UMBER, opacity = 0.1 }) {
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
    <rect width="${size}" height="1" fill="${color}" opacity="${opacity}"/>
    <rect width="1" height="${size}" fill="${color}" opacity="${opacity}"/>
  </pattern>`
}

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
 * The checker and the logotype. Nothing else.
 *
 * Earlier versions carried a header bar, a tagline, four formulas, a bar
 * chart and four portraits. At banner scale that read as a slide rather than
 * a mark, and X shrinks the whole thing to a strip on mobile where none of it
 * was legible anyway.
 *
 * The wordmark is drawn from WORDMARK_GLYPHS — the same glyphs the nav and
 * hero render — so this is the site's mark, not something resembling it.
 */
function banner() {
  const W = 1500
  const H = 500

  // 43 columns at 26px is 1118 wide and 208 tall: big enough to dominate,
  // and centred it spans y 146..354, inside the middle band X keeps when it
  // crops top and bottom on narrow viewports.
  const CELL = 26
  const markW = wordmarkWidth(CELL)
  const markH = WORDMARK_CELL.H * CELL

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
  <defs>${checker({ id: "grid", size: 16, opacity: 0.1 })}</defs>

  <rect width="${W}" height="${H}" fill="${GROUND}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>

  ${wordmarkRects({
    x: Math.round((W - markW) / 2),
    y: Math.round((H - markH) / 2),
    cell: CELL,
    fill: INK,
  })}
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

async function write(name, svg) {
  const out = `${root}public/${name}`
  await sharp(Buffer.from(svg)).png().toFile(out)
  writeFileSync(`${root}public/${name.replace(".png", ".svg")}`, svg)
  const m = await sharp(out).metadata()
  console.log(`${name} written — ${m.width}x${m.height}`)
}

await write("pfp.png", profilePicture(face))
await write("banner.png", banner())

console.log(`portrait: ${face.name} (${face.desk} desk, ${face.id})`)
