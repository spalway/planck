import { BrokerSprite } from "@/components/broker-sprite"
import type { Broker } from "@/lib/brokers"
import { DESKS } from "@/lib/instruments"

function deskLabel(id: Broker["desk"]) {
  return DESKS.find((d) => d.id === id)?.label ?? id.toUpperCase()
}

/**
 * One trait, drawn as a labelled bar.
 *
 * The number alone made three good rolls and three poor ones look identical
 * at a glance. A bar is comparable across a grid of cards without reading.
 */
function Trait({ label, value, max }: { label: string; value: number; max: number }) {
  const filled = Math.round((value / max) * 10)

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="w-16 shrink-0 text-[0.6rem] tracking-widest text-ink-muted">
        {label}
      </span>

      {/* Ten discrete cells rather than a continuous fill — a bar drawn the
          way a sprite would draw it. */}
      <span aria-hidden="true" className="flex flex-1 gap-px">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={i < filled ? "h-2 flex-1 bg-ink" : "h-2 flex-1 bg-ink/15"}
          />
        ))}
      </span>

      <span className="num w-6 shrink-0 text-right text-xs font-bold">{value}</span>
    </div>
  )
}

export function BrokerCard({ broker }: { broker: Broker }) {
  return (
    <article
      data-testid={`broker-card-${broker.id}`}
      className="panel flex min-w-0 flex-col p-4"
    >
      <div className="flex items-start gap-3">
        <div className="panel-sunk shrink-0 p-1">
          <BrokerSprite broker={broker} size={56} />
        </div>

        <div className="min-w-0 flex-1">
          <h3
            data-testid="broker-name"
            className="truncate font-display text-sm font-bold"
          >
            {broker.name}
          </h3>
          <p className="num text-[0.65rem] text-ink-muted">{broker.id}</p>
          <p className="tag mt-1.5 text-[0.55rem]">{deskLabel(broker.desk)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t-2 border-ink/20 pt-3">
        <Trait label="Nerve" value={broker.effectiveNerve} max={100} />
        <Trait label="Latency" value={broker.latency} max={100} />
        <Trait label="Coverage" value={broker.coverage} max={9} />
      </div>

      <div className="mt-3 flex items-baseline justify-between border-t-2 border-ink/20 pt-2">
        <span className="text-[0.6rem] tracking-widest text-ink-muted">
          Tenure
        </span>
        <span className="num text-xs font-bold">{broker.tenureHours}h</span>
      </div>

      <button type="button" disabled className="btn mt-4 w-full py-2 text-[0.65rem]">
        Hire · soon
      </button>
    </article>
  )
}
