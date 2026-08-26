import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * No useEffect may use a concise arrow body.
 *
 * React stores an effect's return value as its cleanup and calls it if it is
 * anything other than undefined — the minified check is literally
 * `if (destroy !== void 0) destroy()`. A concise body silently returns
 * whatever its expression evaluates to, so the effect adopts a cleanup nobody
 * wrote.
 *
 * That is not theoretical. `useEffect(() => window.scrollTo(0, 0), [pathname])`
 * looked safe because scrollTo returns undefined — until a browser extension
 * patched it. React then called a non-function while unmounting, which throws
 * during the commit phase and tears down the entire tree rather than one
 * component. Since that effect keyed on pathname, the site went blank on
 * every navigation and only a reload recovered it.
 *
 * A reviewer cannot reliably eyeball this: the dangerous version is shorter
 * and reads fine. So it is checked mechanically instead.
 */

const SRC = join(process.cwd(), "src")

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) return []
    return [full]
  })
}

/**
 * Matches `useEffect(() => <expression>` — a body that is not a block.
 *
 * The final class excludes whitespace as well as the brace. A lookahead
 * `(?!\{)` is not enough: `\s*` can backtrack to matching nothing, the
 * lookahead then sees a space rather than the brace, and `=> {` matches when
 * it should not.
 */
const CONCISE_EFFECT = /useEffect\(\s*\(\s*\)\s*=>\s*[^{\s]/

describe("effect cleanups", () => {
  const files = sourceFiles(SRC)

  it("finds source files to check", () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it("never declares useEffect with a concise arrow body", () => {
    const offenders = []

    for (const file of files) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (CONCISE_EFFECT.test(line)) {
            offenders.push(
              `${file.replace(process.cwd(), ".")}:${i + 1} — ${line.trim()}`
            )
          }
        })
    }

    expect(
      offenders,
      "a concise body returns its expression, and React calls that as the cleanup:\n" +
        offenders.join("\n")
    ).toEqual([])
  })

  it("catches the shape it is meant to catch", () => {
    // Guards the regex itself, so a rewrite cannot quietly stop matching.
    expect(CONCISE_EFFECT.test("useEffect(() => window.scrollTo(0, 0), [x])")).toBe(true)
    expect(CONCISE_EFFECT.test("useEffect(() => doThing(), [])")).toBe(true)
    expect(CONCISE_EFFECT.test("React.useEffect(() => sub(), [])")).toBe(true)

    expect(CONCISE_EFFECT.test("useEffect(() => {")).toBe(false)
    expect(CONCISE_EFFECT.test("React.useEffect(() => {")).toBe(false)
  })
})
