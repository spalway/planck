/**
 * The $PLANCK mint address.
 *
 * On Solana the "contract address" people paste around IS the mint address.
 * One string, one name. It was briefly configured as both VITE_PLANCK_CA and
 * PLANCK_MINT, and a third copy was hardcoded to null in lib/vault.ts — so
 * setting the address would have lit up the contract section while the
 * funding line at the foot of the same page still said the token was not
 * live. One module, read by everything, is what stops that.
 *
 * Public by design: it is printed on the site. The VITE_ prefix is only what
 * makes it readable from the browser bundle — the server reads the same
 * variable, so there is nothing to keep in sync.
 *
 * Read at BUILD time. Changing it means a rebuild, not a restart.
 */

const raw = (import.meta.env.VITE_PLANCK_MINT as string | undefined) ?? ""

/** Null until the tokens.xyz launch, which is what the UI branches on. */
export const PLANCK_MINT: string | null = raw.trim() === "" ? null : raw.trim()

/** Whether the token exists yet. */
export function tokenLaunched(): boolean {
  return PLANCK_MINT !== null
}
