import * as React from "react"

/**
 * The contract address, stated plainly and placed high on the page.
 *
 * This is the whole of the token's presence on the site: an address, and one
 * line on what the fees do. No price, no chart, no market cap, no ticker —
 * the site argues for the mechanism, and a price widget would make it argue
 * for the trade instead. That restraint is deliberate and worth keeping.
 */

/** Set once the tokens.xyz launch has happened. Public by design. */
const CA = (import.meta.env.VITE_PLANCK_CA as string | undefined) ?? ""

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
  const live = CA.length > 0

  return (
    <section
      id="contract"
      aria-label="Contract address"
      className="border border-ink/20 bg-paper"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="text-[0.65rem] tracking-widest text-ink-muted uppercase">
            $PLANCK contract
          </p>

          {live ? (
            <p
              data-testid="contract-address"
              className="num mt-1.5 text-sm break-all text-ink sm:text-base"
            >
              {CA}
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-ink-muted">
              Not live yet — the address appears here the moment it launches.
            </p>
          )}
        </div>

        {live && (
          <button
            type="button"
            onClick={() => copy(CA)}
            className="shrink-0 border border-ink/25 px-4 py-2 text-xs tracking-widest uppercase hover:border-cobalt hover:text-cobalt"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      <p className="border-t border-ink/15 px-5 py-3 text-xs leading-relaxed text-ink-muted">
        Creator fees on $PLANCK fund the vault, which buys real tokenized assets
        and never sells them. Holding is what opens minting and hiring.
      </p>
    </section>
  )
}
