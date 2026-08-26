/**
 * Broker rolling, server-side.
 *
 * This has to live on the server. If the client rolled its own traits, anyone
 * could POST a 100-nerve, 1-latency broker by editing the request body — the
 * stats would mean nothing and the roster would be worthless within a day.
 *
 * DESK_SIZE mirrors src/lib/instruments.ts. The two are asserted equal in
 * server/brokers.test.mjs, because a silent drift would corrupt the
 * coverage-overflow rule for every broker minted afterwards.
 */

export const DESK_IDS = ["equities", "index", "bullion", "yield", "credit"]

/** Instruments per desk. Must match INSTRUMENTS in src/lib/instruments.ts. */
export const DESK_SIZE = {
  equities: 7,
  index: 2,
  bullion: 2,
  yield: 1,
  credit: 1,
}

const MAX_NERVE = 100

/**
 * Surplus coverage converts to nerve.
 *
 * YIELD and CREDIT hold one instrument each, so without this a high coverage
 * roll would be inert for a third of the roster.
 */
export function effectiveNerve({ desk, nerve, coverage }) {
  const surplus = Math.max(0, coverage - (DESK_SIZE[desk] ?? 1))
  return Math.min(MAX_NERVE, nerve + surplus)
}

/** Desk weighted by sqrt of depth — see the note in src/lib/brokers.ts. */
function weightedDesk(rand) {
  const weights = DESK_IDS.map((d) => Math.sqrt(DESK_SIZE[d]))
  const total = weights.reduce((a, b) => a + b, 0)
  let n = rand() * total
  for (let i = 0; i < DESK_IDS.length; i++) {
    n -= weights[i]
    if (n <= 0) return DESK_IDS[i]
  }
  return DESK_IDS[DESK_IDS.length - 1]
}

const FIRST = [
  "MILO", "RENA", "OTIS", "VESPA", "HALE", "JUNO", "CASK", "IVO",
  "MARL", "PIPP", "TORR", "ELSA", "GRIT", "NOVA", "BRAM", "QUIN",
  "SABLE", "WREN", "DASH", "FLINT", "ORLA", "PACE", "RUE", "ZED",
]

const LAST = [
  "HOLLOWAY", "STRAND", "VANCE", "OKORO", "DELACROIX", "ASH", "KIRBY",
  "NAKASHIMA", "BELL", "FARRAR", "MOSS", "IBARRA",
]

function roll(rand, min, max) {
  return min + Math.floor(rand() * (max - min + 1))
}

function pick(arr, rand) {
  return arr[Math.floor(rand() * arr.length)]
}

/**
 * Roll a new broker.
 *
 * `rand` is injectable so tests are deterministic; production passes
 * Math.random. Uniqueness of the generated name is the caller's problem — the
 * database has a unique constraint on it and the route retries.
 */
export function rollBroker(rand = Math.random) {
  const desk = weightedDesk(rand)
  const traits = {
    desk,
    nerve: roll(rand, 1, MAX_NERVE),
    latency: roll(rand, 1, 100),
    coverage: roll(rand, 1, 9),
  }

  return {
    ...traits,
    name: `${pick(FIRST, rand)} ${pick(LAST, rand)}`,
    effective_nerve: effectiveNerve(traits),
  }
}
