/**
 * Runtime configuration, read from Postgres rather than the environment.
 *
 * The mint address is the one value that changes exactly once, on the day it
 * matters most. As a build-time variable that meant a rebuild and a redeploy
 * to launch. Read from public_config it takes effect within CACHE_MS of an
 * UPDATE, with no deploy.
 *
 * The environment is kept as a fallback, so the site still knows its own
 * address if Supabase is unreachable, and so local development needs no
 * database at all.
 */

import { selectRows } from "./supabase.mjs"

/**
 * Long enough that normal traffic does not hammer Postgres, short enough that
 * launching feels immediate. This is the delay between running the UPDATE and
 * the address appearing on the site.
 */
const CACHE_MS = 15_000

const cache = new Map()

/** A value that is present but blank is unset, not an address. */
function clean(value) {
  const s = typeof value === "string" ? value.trim() : ""
  return s === "" ? null : s
}

/**
 * Read one key.
 *
 * Returns the fallback on any failure. A configuration lookup must never be
 * able to take a route down: if Postgres is unreachable, the correct
 * behaviour is the environment's answer, not a 500.
 */
export async function configValue(key, fallback = null) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value

  let value = fallback
  try {
    const rows = await selectRows(
      "public_config",
      `select=value&key=eq.${encodeURIComponent(key)}&limit=1`
    )
    const found = Array.isArray(rows) && rows.length > 0 ? clean(rows[0].value) : null
    // Only override the fallback when the database actually has a value.
    // A null row means "not set yet", and the environment may still know.
    if (found !== null) value = found
  } catch (e) {
    console.warn(`[APEBITS] config lookup failed for ${key}:`, e.message)
  }

  cache.set(key, { at: Date.now(), value })
  return value
}

/** Exported for tests, and for a future admin route that needs to force a read. */
export function clearConfigCache() {
  cache.clear()
}

export const CONFIG_CACHE_MS = CACHE_MS
