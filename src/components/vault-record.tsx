import { Section, Stat } from "@/components/primitives"
import { usePrices } from "@/hooks/use-prices"
import { EMPTY, pct, usd } from "@/lib/format"
import { ALL_MINTS, instrumentByMint } from "@/lib/instruments"
import { recordsFor, vaultTotals, type Holding } from "@/lib/records"
import { cn } from "@/lib/utils"

export function VaultRecord({ holdings }: { holdings: readonly Holding[] }) {
  const { prices } = usePrices(ALL_MINTS)
  const records = recordsFor(holdings, prices)
  const totals = vaultTotals(holdings, prices)

  return (
    <Section id="holdings" label="04" title="HOLDINGS">
      {holdings.length === 0 ? (
        <p className="panel p-6 text-sm leading-relaxed text-ink-muted">
          The vault has not deployed yet. Nothing has been bought, so there is nothing
          to show. Holdings appear here — with cost basis and live value — the moment
          the first broker is hired.
        </p>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            <Stat label="Cost basis" value={usd(totals.costUsd)} />
            <Stat label="Market value" value={usd(totals.valueUsd)} />
            <Stat
              label="Unrealised"
              value={usd(totals.pnlUsd)}
              tone={
                totals.pnlUsd === null
                  ? "neutral"
                  : totals.pnlUsd >= 0
                    ? "gain"
                    : "loss"
              }
            />
            <Stat
              label="Return"
              value={pct(totals.pnlPct)}
              hint={`${totals.priced} of ${totals.total} priced`}
            />
          </div>

          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b-2 border-umber bg-tan text-left text-[0.65rem] tracking-widest text-ink-muted uppercase">
                  <th className="p-3 font-normal">Instrument</th>
                  <th className="p-3 text-right font-normal">Quantity</th>
                  <th className="p-3 text-right font-normal">Cost</th>
                  <th className="p-3 text-right font-normal">Value</th>
                  <th className="p-3 text-right font-normal">Return</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.mint} className="border-b border-umber/15 last:border-0">
                    <td className="num p-3">
                      {instrumentByMint(r.mint)?.symbol ?? EMPTY}
                    </td>
                    <td className="num p-3 text-right">{r.quantity}</td>
                    <td className="num p-3 text-right">{usd(r.costBasisUsd)}</td>
                    <td className="num p-3 text-right">{usd(r.marketValueUsd)}</td>
                    <td
                      className={cn(
                        "num p-3 text-right",
                        r.pnlPct === null && "text-ink-muted",
                        r.pnlPct !== null && r.pnlPct >= 0 && "text-gain",
                        r.pnlPct !== null && r.pnlPct < 0 && "text-loss",
                      )}
                    >
                      {pct(r.pnlPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  )
}
