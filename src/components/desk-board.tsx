import { Section } from "@/components/primitives"
import { usePrices } from "@/hooks/use-prices"
import type { Broker } from "@/lib/brokers"
import { EMPTY, pct, usd } from "@/lib/format"
import { ALL_MINTS, DESKS, instrumentsForDesk } from "@/lib/instruments"
import type { PriceMap } from "@/lib/jupiter-price"
import { deskTotals, type Holding } from "@/lib/records"
import { cn } from "@/lib/utils"

function Row({
  mint,
  symbol,
  name,
  prices,
}: {
  mint: string
  symbol: string
  name: string
  prices: PriceMap
}) {
  const quote = prices[mint]
  const change = quote?.priceChange24h ?? null

  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-ink/10 py-2 first:border-t-0">
      {/* truncate only works on a flex/block child with min-w-0; on the
          inline span it did nothing and long names such as "MicroStrategy
          xStock" forced the card wider than a phone viewport. */}
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="num shrink-0 text-sm">{symbol}</span>
        <span className="truncate text-xs text-ink-muted">{name}</span>
      </div>
      <div className="flex shrink-0 items-baseline gap-3">
        <span className="num text-sm">{usd(quote?.usdPrice)}</span>
        <span
          className={cn(
            "num w-16 text-right text-xs",
            change === null && "text-ink-muted",
            change !== null && change >= 0 && "text-gain",
            change !== null && change < 0 && "text-loss"
          )}
        >
          {change === null ? EMPTY : pct(change)}
        </span>
      </div>
    </div>
  )
}

export function DeskBoard({
  brokers,
  holdings,
}: {
  brokers: readonly Broker[]
  holdings: readonly Holding[]
}) {
  const { prices, status } = usePrices(ALL_MINTS)

  return (
    <Section id="assets" label="02" title="ASSETS">
      {status === "error" && (
        <p className="mb-6 border border-loss/30 bg-loss/5 px-3 py-2 text-xs text-loss">
          Price feed unavailable. Figures below are the last values received.
        </p>
      )}

      <div // grid-cols-1 is not redundant: without it the implicit mobile track is
        // auto-sized and grows past the viewport. min-w-0 on the item defeats
        // the default min-width:auto that stops a grid child from shrinking.
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {DESKS.map((desk) => {
          const totals = deskTotals(holdings, prices, desk.id)
          const assigned = brokers.filter((b) => b.desk === desk.id).length

          return (
            <article key={desk.id} className="min-w-0 border border-ink/15 bg-paper p-4">
              <h3 className="font-display text-lg">{desk.label}</h3>
              <p className="mt-1 mb-3 text-xs leading-relaxed text-ink-muted">
                {desk.blurb}
              </p>

              <div className="mb-3 flex items-baseline justify-between border-y border-ink/10 py-2">
                <span
                  data-testid={`desk-brokers-${desk.id}`}
                  className="text-[0.65rem] tracking-widest text-ink-muted uppercase"
                >
                  {assigned} {assigned === 1 ? "broker" : "brokers"}
                </span>
                <span data-testid={`desk-value-${desk.id}`} className="num text-xs">
                  {usd(totals.valueUsd)}
                </span>
              </div>

              <div>
                {instrumentsForDesk(desk.id).map((i) => (
                  <Row key={i.mint} {...i} prices={prices} />
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </Section>
  )
}
