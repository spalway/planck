/**
 * The token, kept deliberately quiet.
 *
 * One line and a contract address. No price, no chart, no ticker — the site
 * argues for the mechanism, and a price widget would make it argue for the
 * trade instead.
 */
export function FundingLine({ mint }: { mint: string | null }) {
  return (
    <div className="rule py-8">
      <p className="text-sm text-ink-muted">
        The firm is funded by creator fees on $SBIT. Fees buy real assets the vault
        never sells.
      </p>
      {mint ? (
        <p className="num panel-sunk mt-3 inline-block px-3 py-1.5 text-xs break-all text-ink">
          {mint}
        </p>
      ) : (
        <p className="mt-2 text-xs text-ink-muted">Token not live yet.</p>
      )}
    </div>
  )
}
