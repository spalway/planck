/**
 * The token, kept deliberately quiet.
 *
 * One line and a contract address. No price, no chart, no ticker — the site
 * argues for the mechanism, and a price widget would make it argue for the
 * trade instead.
 */
export function FundingLine({ ca }: { ca: string | null }) {
  return (
    <div className="border-t border-ink/15 py-8">
      <p className="text-sm text-ink-muted">
        The firm is funded by creator fees on $PLANCK. Fees buy real assets the vault
        never sells.
      </p>
      {ca ? (
        <p className="num mt-2 text-xs break-all text-ink">{ca}</p>
      ) : (
        <p className="mt-2 text-xs text-ink-muted">Token not live yet.</p>
      )}
    </div>
  )
}
