/**
 * Broker traits.
 *
 * Every trait drives a mechanic; none are decorative. The one subtlety is
 * COVERAGE: the YIELD and CREDIT desks hold a single instrument each, so a
 * high coverage roll would be inert for a third of the roster. Surplus
 * points instead convert to NERVE at mint, which keeps every roll meaningful
 * on every desk. It is computed once, here, not at hire time.
 *
 * The ROSTER below is a deterministic Phase 1 fixture. Phase 2 replaces it
 * with brokers read from chain; the types do not change.
 */

import { DESKS, instrumentsForDesk, type DeskId } from "@/lib/instruments"

export type BrokerTraits = {
  desk: DeskId
  /** Position size as a percent of the vault's per-engagement allocation. */
  nerve: number
  /** Slots between hire and deployment. Lower is better. */
  latency: number
  /** Instruments held simultaneously. Surplus converts to nerve. */
  coverage: number
}

export type Broker = BrokerTraits & {
  id: string
  name: string
  effectiveNerve: number
  tenureHours: number
}

const MAX_NERVE = 100

export function effectiveNerve(t: BrokerTraits): number {
  const deskSize = instrumentsForDesk(t.desk).length
  const surplus = Math.max(0, t.coverage - deskSize)
  return Math.min(MAX_NERVE, t.nerve + surplus)
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

function pick<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]
}

function roll(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1))
}

export function rollBroker(id: string, rand: () => number): Broker {
  const desk = pick(DESKS, rand).id
  const traits: BrokerTraits = {
    desk,
    nerve: roll(rand, 1, MAX_NERVE),
    latency: roll(rand, 1, 100),
    coverage: roll(rand, 1, 9),
  }

  return {
    ...traits,
    id,
    name: `${pick(FIRST, rand)} ${pick(LAST, rand)}`,
    effectiveNerve: effectiveNerve(traits),
    tenureHours: 0,
  }
}

/**
 * A small deterministic PRNG (mulberry32) so the fixture roster is identical
 * on every load and in every test run. Math.random would reshuffle the floor
 * on each refresh, which reads as fake.
 */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Move a broker to another desk, recomputing the traits that depend on it. */
function reassign(b: Broker, desk: DeskId): Broker {
  const traits: BrokerTraits = {
    desk,
    nerve: b.nerve,
    latency: b.latency,
    coverage: b.coverage,
  }
  return { ...b, ...traits, effectiveNerve: effectiveNerve(traits) }
}

function buildRoster(): Broker[] {
  const rand = mulberry32(0x504c4b42)
  const out: Broker[] = []

  for (let i = 0; i < 24; i++) {
    const b = rollBroker(`PB-${String(i + 1).padStart(3, "0")}`, rand)
    out.push({ ...b, tenureHours: roll(rand, 0, 4000) })
  }

  // Guarantee every desk appears so no desk card renders an empty roster.
  for (const desk of DESKS) {
    if (out.some((b) => b.desk === desk.id)) continue
    const victim = out.findIndex(
      (b) => out.filter((o) => o.desk === b.desk).length > 1
    )
    if (victim === -1) continue
    out[victim] = reassign(out[victim], desk.id)
  }

  return out
}

export const ROSTER: readonly Broker[] = buildRoster()
