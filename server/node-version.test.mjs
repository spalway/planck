import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const pkg = JSON.parse(readFileSync(`${root}/package.json`, "utf8"))

/**
 * The deploy target's Node version, pinned in two places.
 *
 * Railway's nixpacks defaults to Node 18 when a project declares nothing.
 * Vite 8 bundles with rolldown, which imports util.styleText — added in Node
 * 20.12 — so the build died on the deploy host with:
 *
 *   SyntaxError: The requested module 'node:util' does not provide an
 *   export named 'styleText'
 *
 * It built fine locally, because local Node was new enough. Nothing in the
 * repo said what it needed, so nothing could catch the gap.
 */
describe("node version is pinned for deployment", () => {
  it("declares a minimum in engines", () => {
    expect(pkg.engines?.node, "package.json needs engines.node").toBeDefined()
  })

  it("requires a version that has util.styleText", () => {
    const min = Number(String(pkg.engines.node).replace(/[^\d.]/g, "").split(".")[0])
    // 20 is the first major with styleText; 22 is the first LTS with it.
    expect(min).toBeGreaterThanOrEqual(20)
  })

  it("pins the same major in .nvmrc, which is what nixpacks reads", () => {
    const nvmrc = readFileSync(`${root}/.nvmrc`, "utf8").trim()
    const engineMajor = String(pkg.engines.node).replace(/[^\d.]/g, "").split(".")[0]
    expect(Number(nvmrc.replace(/[^\d.]/g, "").split(".")[0])).toBeGreaterThanOrEqual(
      Number(engineMajor)
    )
  })

  it("is actually satisfied by the Node running these tests", () => {
    // If this fails locally, local dev and the deploy target have drifted.
    const major = Number(process.versions.node.split(".")[0])
    const min = Number(String(pkg.engines.node).replace(/[^\d.]/g, "").split(".")[0])
    expect(major).toBeGreaterThanOrEqual(min)
  })

  it("has the API the bundler needs", async () => {
    const { styleText } = await import("node:util")
    expect(typeof styleText).toBe("function")
  })
})
