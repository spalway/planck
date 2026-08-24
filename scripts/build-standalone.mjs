/**
 * Build the whole site into one self-contained HTML file.
 *
 * For sharing a preview where there is no dev server and no host — an
 * artifact, an email, a file:// open. Not the deploy path; Railway serves the
 * normal `dist/` build.
 *
 * Two things differ from a normal build:
 *   - HashRouter, because a single file has no server to rewrite deep links.
 *   - The font is inlined as base64. It lives in public/, which Vite copies
 *     verbatim rather than processing, so the bundler never sees the url()
 *     and cannot inline it for us.
 */

import { execSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const out = `${root}dist-standalone`

// execSync, not execFileSync: Node refuses to spawn a .cmd shim directly on
// Windows (EINVAL), and npx resolves to npx.cmd there.
execSync("npx vite build --config vite.standalone.config.ts --outDir dist-standalone", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, VITE_HASH_ROUTER: "1" },
})

const htmlPath = `${out}/index.html`
let html = readFileSync(htmlPath, "utf8")

const font = readFileSync(`${root}public/fonts/DepartureMono-Regular.woff2`)
const fontUri = `data:font/woff2;base64,${font.toString("base64")}`

// Match the optional leading "./" too. Vite emits a relative url(./fonts/...)
// in the built CSS, so replacing only "/fonts/..." left a stray dot and
// produced url(.data:font/woff2;...) — which the browser rejects, silently
// falling the wordmark back to system monospace.
const before = html.length
html = html.replaceAll(/\.?\/fonts\/DepartureMono-Regular\.woff2/g, fontUri)

if (html.length === before) {
  throw new Error("font url not found in built HTML — inlining silently did nothing")
}
if (html.includes(".data:font")) {
  throw new Error("malformed font data URI — a path prefix survived the replace")
}

// The favicon and OG image are separate files that will not exist alongside a
// lone HTML page. Drop the tags rather than ship broken references.
html = html.replace(/<link rel="icon"[^>]*>/g, "")
html = html.replace(/<meta (property|name)="(og|twitter):image[^>]*>/g, "")

// Full document — openable directly from disk.
writeFileSync(`${out}/standalone.html`, html)

/*
 * Artifact fragment.
 *
 * The artifact host wraps whatever it is given in its own
 * <!doctype html><head></head><body> skeleton. Handing it a complete document
 * nests <html> inside <body>, which renders as a blank white page. So index
 * carries only what belongs inside the body: the inlined stylesheet, the mount
 * point, and the bundle.
 */
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0])

// The bundle is inlined into <head>, not <body>, so collect scripts from the
// whole document. Taking only the body's children silently dropped the app
// and produced a 147KB fragment that rendered nothing.
const scripts = [...html.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0])

const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)
if (!body) throw new Error("no <body> in built HTML — cannot make the fragment")

// Scripts run after the mount point exists, so the root div is never missing.
const mount = body[1].replace(/<script[^>]*>[\s\S]*?<\/script>/g, "").trim()
const fragment = `${styles.join("\n")}\n${mount}\n${scripts.join("\n")}\n`

if (/<html|<!doctype/i.test(fragment)) {
  throw new Error("fragment still contains document tags — it would render blank")
}
if (!scripts.length) throw new Error("no scripts in fragment — the app would not boot")
if (!/id="root"/.test(fragment)) throw new Error("no mount point in fragment")

writeFileSync(htmlPath, fragment)

console.log(`standalone.html : ${(html.length / 1024).toFixed(0)} KB (full document)`)
console.log(`index.html      : ${(fragment.length / 1024).toFixed(0)} KB (artifact fragment)`)
