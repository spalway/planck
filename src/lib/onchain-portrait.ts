/**
 * The bridge between a broker on chain and the portrait the site draws.
 *
 * The program rolls traits from the slot hash, so nobody — not the client, not
 * the program — knows what a broker looks like until the mint has landed. The
 * portrait is therefore rendered FROM chain state, not alongside it, and is
 * written back in a second transaction.
 *
 * This module is also how anyone verifies an inscription. The program stores a
 * hash of whatever bytes the memo carried; it cannot render a PNG, so it
 * cannot check the image against the traits. Re-render here, hash, and compare
 * to `image_hash` — a faked portrait is detectable by anyone who bothers, and
 * that is the claim the site should make rather than "proven on chain".
 *
 * The index tables MUST match the program's own ordering in constants.rs.
 */

import type { Broker } from "@/lib/brokers"
import { effectiveNerve } from "@/lib/brokers"
import type { DeskId } from "@/lib/instruments"
import { spritePngBase64 } from "@/lib/sprite-png"
import { TIERS, type TierId } from "@/lib/sprite-tiers"

/** Program `desk` byte to desk id. Order matches DESK_BPS / DESK_SIZE. */
export const DESK_BY_INDEX: readonly DeskId[] = [
  "equities",
  "index",
  "bullion",
  "yield",
  "credit",
]

/** Program `tier` byte to tier id. Order matches TIER_BPS. */
export const TIER_BY_INDEX: readonly TierId[] = TIERS.map((t) => t.id)

/** The Broker account as the program writes it. */
export type OnChainBroker = {
  owner: string
  index: number
  desk: number
  tier: number
  nerve: number
  latency: number
  coverage: number
  effectiveNerve: number
}

/**
 * Name a broker from its owner and ordinal.
 *
 * Deterministic, so the same broker is called the same thing everywhere
 * without the name having to occupy space in the account.
 */
export function brokerName(owner: string, index: number): string {
  const FIRST = [
    "MILO", "RENA", "OTIS", "VESPA", "HALE", "JUNO", "CASK", "IVO",
    "MARL", "PIPP", "TORR", "ELSA", "GRIT", "NOVA", "BRAM", "QUIN",
    "SABLE", "WREN", "DASH", "FLINT", "ORLA", "PACE", "RUE", "ZED",
  ]
  const LAST = [
    "HOLLOWAY", "STRAND", "VANCE", "OKORO", "DELACROIX", "ASH", "KIRBY",
    "NAKASHIMA", "BELL", "FARRAR", "MOSS", "IBARRA",
  ]
  let h = 2166136261
  for (let i = 0; i < owner.length; i++) {
    h ^= owner.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h = Math.abs(h)
  return `${FIRST[(h + index) % FIRST.length]} ${LAST[(h >> 5) % LAST.length]}`
}

/** An on-chain account into the Broker the renderer expects. */
export function brokerFromChain(b: OnChainBroker): Broker {
  const desk = DESK_BY_INDEX[b.desk] ?? "equities"
  const tier = TIER_BY_INDEX[b.tier] ?? "common"
  const traits = { desk, nerve: b.nerve, latency: b.latency, coverage: b.coverage }

  return {
    ...traits,
    tier,
    id: `PB-${String(b.index + 1).padStart(3, "0")}`,
    name: brokerName(b.owner, b.index),
    // Trust the stored value, but fall back rather than render nothing.
    effectiveNerve: b.effectiveNerve || effectiveNerve(traits),
    tenureHours: 0,
  }
}

/** The base64 portrait for an on-chain broker — what goes in the memo. */
export async function portraitFor(b: OnChainBroker): Promise<string> {
  return spritePngBase64(brokerFromChain(b))
}
