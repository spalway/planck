import * as React from "react"

import { useSiteConfig } from "@/hooks/use-site-config"

/**
 * The contract address, stated plainly and placed high on the page.
 *
 * This is the whole of the token's presence on the site: an address, and
 * nothing else. No price, no chart, no market cap — the site argues for the
 * mechanism, and a price widget would make it argue for the trade instead.
 * That restraint is deliberate and worth keeping.
 *
 * It sits inside the hero now, directly above the two calls to action, so a
 * visitor meets the address before the buttons rather than after them.
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
  const { mint } = useSiteConfig()

  return (
    <section
      id="contract"
      aria-label="Contract address"
      className="panel bg-bar text-ground"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          {/* Black, not the inverted bone: this is the one label on the card
              that names what the address is, and the filled black block is
              what the palette reserves for a mark that indexes something.
              Larger than the other tags on the page — the label grows, the
              card does not. */}
          <span className="tag px-2 py-0.5 text-sm">$SBIT contract</span>

          {mint !== null ? (
            // A sunk well: the address is a value to be read and copied, not
            // a surface to act on. Dark rather than tan, because a bone well
            // on a brown card is the brightest thing in the hero and pulls
            // the eye off the wordmark.
            <p
              data-testid="contract-address"
              className="num mt-2.5 border-2 border-ground/35 bg-black/25 px-3 py-2 text-sm break-all text-ground sm:text-base"
            >
              {mint}
            </p>
          ) : (
            <p className="mt-2.5 text-sm text-ground/70">
              Not live yet — the address appears here the moment it launches.
            </p>
          )}
        </div>

        {mint !== null && (
          <button
            type="button"
            onClick={() => copy(mint)}
            className="btn btn-invert shrink-0 px-4 py-2 text-xs"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </section>
  )
}
