import * as React from "react"

import { PLANCK_MINT } from "@/lib/token"

/**
 * The contract address, stated plainly and placed high on the page.
 *
 * This is the whole of the token's presence on the site: an address, and one
 * line on what the fees do. No price, no chart, no market cap, no ticker —
 * the site argues for the mechanism, and a price widget would make it argue
 * for the trade instead. That restraint is deliberate and worth keeping.
 */



function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(t)
  }, [copied])

  const copy = React.useCallback((text: string) => {
    // Older browsers and any non-secure origin have no clipboard API.
    navigator.clipboard
      ?.writeText(text)
      .then(() => setCopied(true))
      .catch(() => setCopied(false))
  }, [])

  return [copied, copy]
}

export function ContractSection() {
  const [copied, copy] = useCopy()
  const mint = PLANCK_MINT

  return (
    <section id="contract" aria-label="Contract address" className="panel">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <span className="tag text-[0.6rem]">$PLANCK contract</span>

          {mint !== null ? (
            // A sunk well: the address is a value to be read and copied, not
            // a surface to act on.
            <p
              data-testid="contract-address"
              className="num panel-sunk mt-2.5 px-3 py-2 text-sm break-all text-ink sm:text-base"
            >
              {mint}
            </p>
          ) : (
            <p className="mt-2.5 text-sm text-ink-muted">
              Not live yet — the address appears here the moment it launches.
            </p>
          )}
        </div>

        {mint !== null && (
          <button
            type="button"
            onClick={() => copy(mint)}
            className="btn shrink-0 px-4 py-2 text-xs"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      <p className="border-t-2 border-ink/20 px-5 py-3 text-xs leading-relaxed text-ink-muted">
        Creator fees on $PLANCK fund the vault, which buys real tokenized assets
        and never sells them. Holding is what opens minting and hiring.
      </p>
    </section>
  )
}
