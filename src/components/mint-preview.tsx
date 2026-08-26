import { BrokerSprite } from "@/components/broker-sprite"
import { deskRollOdds, ROSTER } from "@/lib/brokers"
import { DESKS } from "@/lib/instruments"

/**
 * What a mint actually rolls, shown to someone who cannot mint yet.
 *
 * Before this, /mint was a heading, a paragraph and a single "connect a
 * wallet" box — about 560px of content on an 812px viewport, so most of the
 * page was empty background. Anyone arriving without a wallet learned
 * nothing about what they were being asked to connect for.
 *
 * Every figure here is derived, not written down: the odds come from the
 * same weighting the roll uses, and the sample portraits are brokers who are
 * genuinely on the floor.
 */

function deskLabel(id: string) {
  return DESKS.find((d) => d.id === id)?.label ?? id.toUpperCase()
}

/** Five brokers spread across the roster rather than the first five, which
    clustered on one desk and made the floor look monotonous. */
const SAMPLES = [0, 5, 10, 15, 20].map((i) => ROSTER[i]).filter(Boolean)

function Odds() {
  const odds = deskRollOdds()

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b-2 border-umber bg-tan text-left text-[0.6rem] tracking-widest text-ink-muted uppercase">
          <th className="p-2.5 font-normal">Desk</th>
          <th className="p-2.5 text-right font-normal">Instruments</th>
          <th className="w-1/3 p-2.5 text-right font-normal">Chance</th>
        </tr>
      </thead>
      <tbody>
        {odds.map((o) => (
          <tr key={o.desk} className="border-b border-umber/15 last:border-0">
            <td className="p-2.5 text-xs">{deskLabel(o.desk)}</td>
            <td className="num p-2.5 text-right text-xs">{o.instruments}</td>
            <td className="p-2.5">
              <span className="flex items-center justify-end gap-2">
                <span
                  aria-hidden="true"
                  className="h-2 bg-umber"
                  style={{ width: `${Math.round(o.chance * 100)}%` }}
                />
                <span className="num w-9 shrink-0 text-right text-xs font-bold">
                  {Math.round(o.chance * 100)}%
                </span>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const TRAITS = [
  {
    name: "Nerve",
    range: "1 – 100",
    body: "Position size as a percent of the vault's per-engagement allocation.",
  },
  {
    name: "Latency",
    range: "1 – 100",
    body: "Slots between hire and deployment. Lower is better.",
  },
  {
    name: "Coverage",
    range: "1 – 9",
    body: "Instruments held at once. Anything above his desk's depth converts to nerve, so a high roll is never wasted.",
  },
]

export function MintPreview() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-display text-base font-bold">WHAT YOU ROLL FOR</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
          A broker is a desk plus three traits. The desk and the traits are both fixed
          at mint. These five are already on the floor.
        </p>
      </div>

      <ul className="panel grid grid-cols-2 gap-0.5 bg-umber sm:grid-cols-5">
        {SAMPLES.map((b) => (
          <li key={b.id} className="flex flex-col items-center gap-2 bg-paper p-4">
            <BrokerSprite broker={b} size={64} />
            <span className="w-full truncate text-center font-display text-[0.6rem] font-bold">
              {b.name}
            </span>
            <span className="text-[0.55rem] tracking-widest text-ink-muted uppercase">
              {deskLabel(b.desk)}
            </span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-display text-base font-bold">DESK ODDS</h3>
          <p className="mt-2 mb-3 text-sm leading-relaxed text-ink-muted">
            Weighted by how many instruments a desk carries, so the floor mirrors the
            book. Shallow desks stay reachable.
          </p>
          <div className="panel overflow-x-auto">
            <Odds />
          </div>
        </div>

        <div>
          <h3 className="font-display text-base font-bold">TRAITS</h3>
          <p className="mt-2 mb-3 text-sm leading-relaxed text-ink-muted">
            Every trait drives a mechanic. None are decorative.
          </p>
          <dl className="panel divide-y-2 divide-umber/15">
            {TRAITS.map((t) => (
              <div key={t.name} className="p-3">
                <dt className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-bold tracking-widest uppercase">
                    {t.name}
                  </span>
                  <span className="num text-xs text-ink-muted">{t.range}</span>
                </dt>
                <dd className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {t.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
