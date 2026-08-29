import * as React from "react"

/**
 * Runtime config, fetched rather than compiled in.
 *
 * The mint address used to be VITE_PLANCK_MINT, baked into the bundle at
 * build time, so launching the token meant a rebuild and a redeploy. It now
 * lives in public_config in Postgres and arrives over /api/config, which
 * means an UPDATE takes effect within seconds and the address is never wrong
 * on the site while a deploy runs.
 *
 * The build-time value survives as the initial state, so a deploy that has
 * one configured shows the right address on the very first frame instead of
 * flashing "not live yet" until the fetch lands.
 */

const BUILD_TIME_MINT =
  ((import.meta.env.VITE_PLANCK_MINT as string | undefined) ?? "").trim() || null

export type SiteConfig = {
  /** Null until the token launches. */
  mint: string | null
  /** False only until the first response; the UI does not need to block on it. */
  loaded: boolean
}

/** Re-check periodically so a page left open at launch picks the address up. */
const REFRESH_MS = 30_000

export function useSiteConfig(): SiteConfig {
  const [mint, setMint] = React.useState<string | null>(BUILD_TIME_MINT)
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    async function read() {
      try {
        const res = await fetch("/api/config", {
          signal: controller.signal,
          headers: { accept: "application/json" },
        })
        if (!res.ok) return

        const body = (await res.json()) as { mint?: string | null }
        if (cancelled) return

        const next = typeof body.mint === "string" ? body.mint.trim() : ""
        // An empty answer means not launched. Falling back to the build-time
        // value here would resurrect an address the database has cleared.
        setMint(next === "" ? null : next)
      } catch {
        // Keep whatever we already had. A config lookup failing is not a
        // reason to tell a visitor the token does not exist.
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }

    void read()
    const timer = setInterval(() => void read(), REFRESH_MS)

    return () => {
      cancelled = true
      controller.abort()
      clearInterval(timer)
    }
  }, [])

  return { mint, loaded }
}
