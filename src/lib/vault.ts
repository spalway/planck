/**
 * The vault's book.
 *
 * The mint address moved to lib/token.ts — it was hardcoded null here and
 * silently contradicted the contract section.
 *
 * A Phase 1 fixture that is deliberately empty — the firm has not deployed,
 * and the site says so rather than inventing a portfolio. Phase 2 replaces
 * this with holdings read from the vault address.
 */

import type { Holding } from "@/lib/records"

export const VAULT_HOLDINGS: readonly Holding[] = []
