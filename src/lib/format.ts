/**
 * Display formatting.
 *
 * The one rule that matters: an absent number renders as an em dash, never
 * as zero. A fabricated $0 on a desk board is indistinguishable from a real
 * collapse, and this site's whole claim is that its numbers are real.
 */

export const EMPTY = "—"

function bad(n: number | null | undefined): n is null | undefined {
  return n === null || n === undefined || !Number.isFinite(n)
}

/** Sub-dollar instruments carry four decimals; cents would hide the move. */
export function usd(n: number | null | undefined): string {
  if (bad(n)) return EMPTY
  const digits = Math.abs(n) < 10 ? 4 : 2
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

export function pct(n: number | null | undefined): string {
  if (bad(n)) return EMPTY
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toFixed(2)}%`
}
