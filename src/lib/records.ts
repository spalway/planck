/**
 * Track records and P&L.
 *
 * The site's whole claim is that its numbers are derived rather than
 * authored, and this is where the deriving happens: market value is
 * quantity times a live Jupiter price, and return is that against a cost
 * basis recorded on chain. Nothing here invents a figure.
 *
 * Two rules the tests pin down:
 *
 *  - A missing price nulls every dependent field rather than contributing
 *    zero. Summing a partially-priced desk understates it, and an
 *    understated desk on a bone-white page reads as a crash.
 *  - A zero cost basis yields a null percentage, not Infinity.
 *
 * Pure by design: no network, no React, no wallet. All of it unit-testable.
 */

import { instrumentByMint, type DeskId } from "@/lib/instruments"
import type { PriceMap } from "@/lib/jupiter-price"

export type Holding = {
  mint: string
  quantity: number
  /** Total USD paid, not per-unit. */
  costBasisUsd: number
}

export type HoldingRecord = Holding & {
  livePrice: number | null
  marketValueUsd: number | null
  pnlUsd: number | null
  pnlPct: number | null
}

export function recordFor(h: Holding, prices: PriceMap): HoldingRecord {
  const quote = prices[h.mint]
  const livePrice = quote?.usdPrice ?? null

  if (livePrice === null) {
    return { ...h, livePrice: null, marketValueUsd: null, pnlUsd: null, pnlPct: null }
  }

  const marketValueUsd = h.quantity * livePrice
  const pnlUsd = marketValueUsd - h.costBasisUsd
  const pnlPct = h.costBasisUsd > 0 ? (pnlUsd / h.costBasisUsd) * 100 : null

  return { ...h, livePrice, marketValueUsd, pnlUsd, pnlPct }
}

export function recordsFor(
  hs: readonly Holding[],
  prices: PriceMap
): HoldingRecord[] {
  return hs.map((h) => recordFor(h, prices))
}

/** Sum a set of records, nulling the total if any leg is unpriced. */
function sumValue(rs: readonly HoldingRecord[]): number | null {
  if (rs.length === 0) return null
  if (rs.some((r) => r.marketValueUsd === null)) return null
  return rs.reduce((acc, r) => acc + (r.marketValueUsd ?? 0), 0)
}

export function deskTotals(
  hs: readonly Holding[],
  prices: PriceMap,
  desk: DeskId
): { costUsd: number; valueUsd: number | null; pnlPct: number | null } {
  const mine = hs.filter((h) => instrumentByMint(h.mint)?.desk === desk)
  const records = recordsFor(mine, prices)

  const costUsd = mine.reduce((acc, h) => acc + h.costBasisUsd, 0)
  const valueUsd = sumValue(records)
  const pnlPct =
    valueUsd !== null && costUsd > 0 ? ((valueUsd - costUsd) / costUsd) * 100 : null

  return { costUsd, valueUsd, pnlPct }
}

export function vaultTotals(
  hs: readonly Holding[],
  prices: PriceMap
): {
  costUsd: number
  valueUsd: number | null
  pnlUsd: number | null
  pnlPct: number | null
  priced: number
  total: number
} {
  const records = recordsFor(hs, prices)

  const costUsd = hs.reduce((acc, h) => acc + h.costBasisUsd, 0)
  const valueUsd = sumValue(records)
  const pnlUsd = valueUsd === null ? null : valueUsd - costUsd
  const pnlPct = pnlUsd !== null && costUsd > 0 ? (pnlUsd / costUsd) * 100 : null

  return {
    costUsd,
    valueUsd,
    pnlUsd,
    pnlPct,
    priced: records.filter((r) => r.livePrice !== null).length,
    total: records.length,
  }
}
