import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { ROUTES } from "@/lib/nav"

// import.meta.url is not a file:// URL under vitest's transform; cwd is the
// project root.
const root = process.cwd()
const viteConfig = readFileSync(`${root}/vite.config.ts`, "utf8")
// The static-serving rules live in app.mjs; index.mjs only wires and listens.
const server = readFileSync(`${root}/server/app.mjs`, "utf8")

/**
 * The build output directory and the server's cache rule are coupled, and both
 * are coupled to the page routes. Nothing else would catch a drift: the site
 * still renders, it just serves assets uncached or 301s a real page away.
 */
describe("static asset directory", () => {
  it("is not named after any page route", () => {
    // dist/assets next to a /assets route made express.static treat the page
    // as a directory and redirect it.
    const match = viteConfig.match(/assetsDir:\s*"([^"]+)"/)
    expect(match, "assetsDir must be set explicitly in vite.config.ts").not.toBeNull()

    const dir = match[1]
    const routeNames = ROUTES.map((r) => r.path.replace(/^\//, "")).filter(Boolean)
    expect(routeNames).not.toContain(dir)
  })

  it("is the same directory the server marks immutable", () => {
    const dir = viteConfig.match(/assetsDir:\s*"([^"]+)"/)[1]
    expect(server).toContain(`/${dir}/`)
  })

  it("normalises path separators before matching", () => {
    // express.static hands back native paths; a bare "/static/" check silently
    // never matches on Windows and every asset ships uncached.
    expect(server).toMatch(/split\("\\\\"\)|replace\(.*\\\\.*\)/)
  })

  it("never caches index.html", () => {
    expect(server).toMatch(/index\.html[\s\S]{0,80}no-cache/)
  })
})
