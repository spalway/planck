/**
 * A minimal Supabase read client.
 *
 * Supabase exposes PostgREST over plain HTTP, so reading a table is a GET
 * with two headers. @supabase/supabase-js would add a dependency, a realtime
 * websocket stack and an auth layer for what is currently four select
 * queries. When wallet sign-in lands, revisit — auth is where the real client
 * earns its place.
 *
 * Reads only. The anon key cannot write: RLS defines select policies and no
 * others, so every insert runs server-side under the service role. A client
 * able to insert its own engagement could grant itself a track record.
 */

const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Until both exist the app runs on local fixtures. */
export function supabaseConfigured(): boolean {
  return Boolean(URL_BASE && ANON_KEY)
}

/**
 * Select rows from a table.
 *
 * `query` is raw PostgREST syntax, e.g. `select=*&order=tenure_hours.desc`.
 * Returns null on any failure so callers can fall back rather than crash.
 */
export async function selectFrom<T>(
  table: string,
  query: string,
  signal?: AbortSignal
): Promise<T[] | null> {
  if (!supabaseConfigured()) return null

  const url = `${URL_BASE}/rest/v1/${table}?${query}`

  try {
    const res = await fetch(url, {
      signal,
      headers: {
        apikey: ANON_KEY as string,
        Authorization: `Bearer ${ANON_KEY}`,
        Accept: "application/json",
      },
    })

    if (!res.ok) {
      console.warn(`[PLANCKBITS] supabase ${table} returned ${res.status}`)
      return null
    }

    const rows = (await res.json()) as unknown
    return Array.isArray(rows) ? (rows as T[]) : null
  } catch (e) {
    if ((e as Error).name !== "AbortError") {
      console.warn(`[PLANCKBITS] supabase ${table} fetch failed:`, e)
    }
    return null
  }
}
