import { usePrices } from "@/hooks/use-prices"
import { EMPTY, pct, usd } from "@/lib/format"
import { ALL_MINTS, DESKS, INSTRUMENTS, instrumentsForDesk } from "@/lib/instruments"
import { cn } from "@/lib/utils"

/**
 * What the vault is mandated to buy, shown while it holds nothing.
 *
 * An empty vault is the honest state before launch, but saying only "nothing
 * to show" left /holdings at ~500px of content — most of the page was empty
 * background, and a visitor could not tell what the vault would ever hold.
 *
 * The prices here are live from Jupiter. That matters: it is the same feed
 * the record will be marked against once the vault deploys, so this page is
 * already showing real data rather than a placeholder.
 */

const RULES = [
  {
    head: "It buys on hire",
    body: "An engagement is what moves the vault. Nothing is bought on a schedule and nothing is bought on a view.",
  },
  {
    head: "It never sells",
    body: "There is no exit. The book only grows, which is what makes the track record cumulative rather than a series of trades.",
  },
  {
    head: "Basis is stamped",
    body: "Cost is recorded at purchase. Every return on this site is live price against that number — arithmetic on public data, not a claim we make.",
  },
]

export function VaultMandate() {
  const { prices, status } = usePrices(ALL_MINTS)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="font-display text-base font-bold">the mandate</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
          {INSTRUMENTS.length} tokenized instruments across {DESKS.length} desks.
          When a broker is hired, the vault buys into his desk — and only his desk.
        </p>
      </div>

      {status === "error" && (
        <p className="border-2 border-loss bg-loss/10 px-3 py-2 text-xs font-bold text-loss">
          Price feed unavailable. The instruments below are still the mandate.
        </p>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-5">
        {DESKS.map((desk) => (
          <article key={desk.id} className="panel min-w-0 p-4">
            <h4 className="font-display text-sm font-bold">{desk.label}</h4>
            <p className="mt-1 mb-3 text-xs leading-relaxed text-ink-muted">
              {desk.blurb}
            </p>

            <div className="border-t-2 border-ink/20 pt-1">
              {instrumentsForDesk(desk.id).map((i) => {
                const quote = prices[i.mint]
                const change = quote?.priceChange24h ?? null

                return (
                  <div
                    key={i.mint}
                    className="flex items-baseline justify-between gap-2 border-t border-ink/10 py-1.5 first:border-t-0"
                  >
                    <span className="num min-w-0 flex-1 truncate text-xs">
                      {i.symbol}
                    </span>
                    <span className="num shrink-0 text-xs">{usd(quote?.usdPrice)}</span>
                    <span
                      className={cn(
                        "num w-14 shrink-0 text-right text-[0.65rem]",
                        change === null && "text-ink-muted",
                        change !== null && change >= 0 && "text-gain",
                        change !== null && change < 0 && "text-loss",
                      )}
                    >
                      {change === null ? EMPTY : pct(change)}
                    </span>
                  </div>
                )
              })}
            </div>
          </article>
        ))}
      </div>

      <div>
        <h3 className="font-display text-base font-bold">the rules</h3>
        <ol className="panel mt-3 grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-0.5 bg-ink">
          {RULES.map((r, i) => (
            <li key={r.head} className="flex min-w-0 flex-col bg-paper p-4">
              <span className="num tag self-start text-[0.55rem]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h4 className="mt-2.5 font-display text-sm font-bold">{r.head}</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{r.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
