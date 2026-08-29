/**
 * Where the roster comes from.
 *
 * One seam between the app and its broker data. Today that is the local
 * fixture; once VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set it is
 * Postgres, with no change anywhere else in the app.
 *
 * The async signature exists now, before Supabase does, so the UI already
 * carries loading and error states. Retrofitting those later would touch
 * every page.
 */

import { ROSTER, effectiveNerve, type Broker } from "@/lib/brokers"
import type { DeskId } from "@/lib/instruments"
import { TIERS, type TierId } from "@/lib/sprite-tiers"
import { selectFrom, supabaseConfigured } from "@/lib/supabase"

/** Column shape of `public.brokers`. See supabase/migrations/0001_init.sql. */
type BrokerRow = {
  id: string
  name: string
  desk: DeskId
  nerve: number
  latency: number
  coverage: number
  effective_nerve: number | null
  tenure_hours: number | null
  /** Added by 0004. Null on every row written before it. */
  tier: TierId | null
}

const DESKS = new Set<DeskId>(["equities", "index", "bullion", "yield", "credit"])
const TIER_IDS = new Set<string>(TIERS.map((t) => t.id))

/**
 * Map a database row to a Broker, dropping anything malformed.
 *
 * effective_nerve is recomputed when the column is null so an older row
 * written before the overflow rule existed still sorts correctly.
 */
export function rowToBroker(row: BrokerRow): Broker | null {
  if (!row?.id || !row?.name || !DESKS.has(row.desk)) return null

  const nerve = Number(row.nerve)
  const latency = Number(row.latency)
  const coverage = Number(row.coverage)
  if (![nerve, latency, coverage].every(Number.isFinite)) return null

  // An unrecognised or missing tier falls back rather than dropping the row.
  // A broker with no fur is a hole in the floor; a common-looking one is not.
  const tier: TierId =
    typeof row.tier === "string" && TIER_IDS.has(row.tier)
      ? (row.tier as TierId)
      : "common"

  const traits = { desk: row.desk, nerve, latency, coverage, tier }
  const stored = Number(row.effective_nerve)

  return {
    ...traits,
    id: row.id,
    name: row.name,
    effectiveNerve: Number.isFinite(stored) && stored > 0
      ? stored
      : effectiveNerve(traits),
    tenureHours: Number.isFinite(Number(row.tenure_hours))
      ? Number(row.tenure_hours)
      : 0,
  }
}

export type RosterSource = "fixture" | "supabase"

export function rosterSource(): RosterSource {
  return supabaseConfigured() ? "supabase" : "fixture"
}

/**
 * Load the roster.
 *
 * Returns null only when a configured Supabase failed — the caller surfaces
 * that rather than silently showing fixture data, which would be a lie about
 * where the numbers came from.
 */
export async function fetchRoster(signal?: AbortSignal): Promise<Broker[] | null> {
  if (!supabaseConfigured()) return [...ROSTER]

  const rows = await selectFrom<BrokerRow>(
    "brokers",
    "select=*&order=tenure_hours.desc",
    signal
  )
  if (rows === null) return null

  return rows.map(rowToBroker).filter((b): b is Broker => b !== null)
}
