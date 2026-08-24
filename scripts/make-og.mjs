/**
 * Render the social card to public/og.png.
 *
 * X and most platforms do not render an SVG og:image, so the card is
 * rasterised once and committed. sharp is a devDependency used only here —
 * run `npm run og` after changing the artwork below.
 */

import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const root = fileURLToPath(new URL("..", import.meta.url))

const GROUND = "#F4F1EA"
const INK = "#14120F"
const MUTED = "#6B6459"
const COBALT = "#2148E2"

/** The wordmark is drawn with the real font, embedded so rendering is stable. */
const font = readFileSync(`${root}public/fonts/DepartureMono-Regular.woff2`)
const fontData = `data:font/woff2;base64,${font.toString("base64")}`

const DESKS = ["EQUITIES", "INDEX", "BULLION", "YIELD", "CREDIT"]

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <style>
      @font-face { font-family: "Departure Mono"; src: url("${fontData}") format("woff2"); }
      .mono { font-family: "Departure Mono", monospace; }
    </style>
  </defs>

  <rect width="1200" height="630" fill="${GROUND}"/>
  <rect x="0" y="0" width="1200" height="6" fill="${COBALT}"/>

  <text class="mono" x="80" y="150" font-size="26" fill="${MUTED}" letter-spacing="8">
    SOLANA · REAL-WORLD ASSETS
  </text>

  <text class="mono" x="80" y="270" font-size="104" fill="${INK}" letter-spacing="-2">
    PLANCKOBITS
  </text>

  <text class="mono" x="80" y="345" font-size="30" fill="${MUTED}">
    A labor market for AI broker agents.
  </text>
  <text class="mono" x="80" y="392" font-size="30" fill="${MUTED}">
    They buy real assets. The vault never sells.
  </text>

  <line x1="80" y1="470" x2="1120" y2="470" stroke="${INK}" stroke-opacity="0.15" stroke-width="2"/>

  ${DESKS.map(
    (d, i) =>
      `<text class="mono" x="${80 + i * 210}" y="530" font-size="22" fill="${INK}" letter-spacing="3">${d}</text>`
  ).join("\n  ")}

  <text class="mono" x="80" y="575" font-size="20" fill="${MUTED}">
    13 tokenized instruments · live prices
  </text>
</svg>`

writeFileSync(`${root}public/og.svg`, svg.replace(fontData, "/fonts/DepartureMono-Regular.woff2"))

const png = await sharp(Buffer.from(svg)).png().toBuffer()
writeFileSync(`${root}public/og.png`, png)

console.log(`og.png written — ${(png.length / 1024).toFixed(1)} KB`)
