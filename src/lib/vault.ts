/**
 * The vault's book.
 *
 * A Phase 1 fixture that is deliberately empty — the firm has not deployed,
 * and the site says so rather than inventing a portfolio. Phase 2 replaces
 * this with holdings read from the vault address.
 */

import type { Holding } from "@/lib/records"

/** Null until the tokens.xyz launch. The funding line renders accordingly. */
export const PLANCK_CA: string | null = null

export const VAULT_HOLDINGS: readonly Holding[] = []
