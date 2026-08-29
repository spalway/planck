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
import { TIERS, rollTier, type TierId } from "@/lib/sprite-tiers"

export type BrokerTraits = {
  desk: DeskId
  /** Position size as a percent of the vault's per-engagement allocation. */
  nerve: number
  /** Slots between hire and deployment. Lower is better. */
  latency: number
  /** Instruments held simultaneously. Surplus converts to nerve. */
  coverage: number
  /**
   * Scarcity band. COSMETIC — it drives fur, ground and garment palette and
   * nothing else. effectiveNerve must never read it, or a rare-looking broker
   * would also be a better one and the stats would stop meaning anything.
   */
  tier: TierId
}

export type Broker = BrokerTraits & {
  id: string
  name: string
  effectiveNerve: number
  tenureHours: number
}

const MAX_NERVE = 100
const ROSTER_SIZE = 24
const MIN_PER_DESK = 3

/**
 * Takes only the three fields it reads, not the whole trait set.
 *
 * That is deliberate. TIER is cosmetic, and a signature that cannot see it
 * cannot accidentally start pricing it in — the rule is enforced by the type
 * rather than by a comment someone edits past.
 */
export function effectiveNerve(t: {
  desk: DeskId
  nerve: number
  coverage: number
}): number {
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
    tier: rollTier(rand),
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

/**
 * Desk assignment weighted by how many instruments the desk carries.
 *
 * An unweighted roll put three brokers on EQUITIES (seven instruments) and
 * six on INDEX (two), which reads backwards — the deepest desk looked
 * abandoned. Weighting by depth makes the floor mirror the book.
 */
export type DeskOdds = {
  desk: DeskId
  instruments: number
  /** Probability in 0..1 that a mint lands on this desk. */
  chance: number
}

/**
 * The desk distribution a mint rolls against.
 *
 * Exported so the mint page can state the odds it actually uses. A hand-
 * written table on the page would drift silently the first time an
 * instrument is added to a desk, and the site would then be quoting odds
 * that are not the ones being rolled.
 */
export function deskRollOdds(): DeskOdds[] {
  // sqrt, not raw depth: raw proportional weighting put 13 of 24 brokers on
  // EQUITIES and left YIELD and CREDIT with one each. The square root keeps
  // the ordering while giving the shallow desks a real presence.
  const weights = DESKS.map((d) => Math.sqrt(instrumentsForDesk(d.id).length))
  const total = weights.reduce((a, b) => a + b, 0)

  return DESKS.map((d, i) => ({
    desk: d.id,
    instruments: instrumentsForDesk(d.id).length,
    chance: weights[i] / total,
  }))
}

function weightedDesk(rand: () => number): DeskId {
  const odds = deskRollOdds()
  let n = rand()
  for (const o of odds) {
    n -= o.chance
    if (n <= 0) return o.desk
  }
  return odds[odds.length - 1].desk
}

/** Deterministic Fisher-Yates, so the shuffle is stable across loads. */
function shuffled<T>(arr: readonly T[], rand: () => number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

function buildRoster(): Broker[] {
  const rand = mulberry32(0x504c4b42)

  // Unique names. Drawing first and last independently produced four ZEDs
  // and a duplicated SABLE VANCE, which reads as a bug rather than a roster.
  const pairs: string[] = []
  for (const f of FIRST) for (const l of LAST) pairs.push(`${f} ${l}`)
  const names = shuffled(pairs, rand).slice(0, ROSTER_SIZE)

  const out: Broker[] = []
  for (let i = 0; i < ROSTER_SIZE; i++) {
    const traits: BrokerTraits = {
      desk: weightedDesk(rand),
      nerve: roll(rand, 1, MAX_NERVE),
      latency: roll(rand, 1, 100),
      coverage: roll(rand, 1, 9),
      tier: rollTier(rand),
    }

    // Roughly a third of the floor is idle. With every broker employed the
    // census reported zero available to hire, contradicting the product.
    const idle = roll(rand, 0, 2) === 0

    out.push({
      ...traits,
      id: `PB-${String(i + 1).padStart(3, "0")}`,
      name: names[i],
      effectiveNerve: effectiveNerve(traits),
      tenureHours: idle ? 0 : roll(rand, 40, 4000),
    })
  }

  // Enforce a floor per desk rather than merely non-empty. Weighted rolling
  // is still random: one seed left CREDIT with a single broker next to ten on
  // EQUITIES, which looks broken rather than lopsided. Moving surplus off the
  // largest desk is deterministic and holds for any seed.
  for (const desk of DESKS) {
    while (out.filter((b) => b.desk === desk.id).length < MIN_PER_DESK) {
      const counts = new Map<DeskId, number>()
      for (const b of out) counts.set(b.desk, (counts.get(b.desk) ?? 0) + 1)

      let biggest: DeskId | null = null
      for (const [id, n] of counts) {
        if (id === desk.id) continue
        if (biggest === null || n > (counts.get(biggest) ?? 0)) biggest = id
      }
      if (biggest === null || (counts.get(biggest) ?? 0) <= MIN_PER_DESK) break

      const victim = out.findIndex((b) => b.desk === biggest)
      const v = out[victim]
      const traits: BrokerTraits = {
        desk: desk.id,
        nerve: v.nerve,
        latency: v.latency,
        coverage: v.coverage,
        tier: v.tier,
      }
      out[victim] = { ...v, ...traits, effectiveNerve: effectiveNerve(traits) }
    }
  }

  // Hold the founding floor to the declared odds.
  //
  // The seed rolled two LEGENDARY brokers into 24 — 8% of the floor against
  // declared odds of 0.5%. Nobody owns these; they are the house's own. But a
  // visitor counts what is on the wall before they mint, and a floor showing
  // two legendaries advertises scarcity sixteen times more generous than the
  // mint offers. That is a lie told with a fixture.
  //
  // Same reasoning as MIN_PER_DESK above: weighted rolling is still random,
  // and an unrepresentative sample reads as the rule rather than the draw.
  // Surplus is demoted to COMMON, deterministically, lowest id first.
  //
  // Note the consequence, which is the point: no LEGENDARY exists until
  // somebody mints one.
  for (const tier of TIERS) {
    const cap = Math.round(tier.odds * ROSTER_SIZE)
    const held = out.filter((b) => b.tier === tier.id)
    for (const b of held.slice(cap)) {
      out[out.indexOf(b)] = { ...b, tier: "common" }
    }
  }

  return out
}

export const ROSTER: readonly Broker[] = buildRoster()
