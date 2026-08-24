import { BrokerSprite } from "@/components/broker-sprite"
import type { Broker } from "@/lib/brokers"
import { DESKS } from "@/lib/instruments"

function deskLabel(id: Broker["desk"]) {
  return DESKS.find((d) => d.id === id)?.label ?? id.toUpperCase()
}

function Trait({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[0.65rem] tracking-widest text-ink-muted uppercase">
        {label}
      </span>
      <span className="num text-sm">{value}</span>
    </div>
  )
}

export function BrokerCard({ broker }: { broker: Broker }) {
  return (
    <article
      data-testid={`broker-card-${broker.id}`}
      className="flex min-w-0 flex-col border border-ink/15 bg-paper p-4"
    >
      <div className="flex items-start gap-3">
        <BrokerSprite broker={broker} size={56} />
        <div className="min-w-0">
          <h3 data-testid="broker-name" className="truncate font-display text-sm">
            {broker.name}
          </h3>
          <p className="num text-[0.65rem] text-ink-muted">{broker.id}</p>
          <p className="mt-1 text-[0.65rem] tracking-widest text-cobalt uppercase">
            {deskLabel(broker.desk)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5 border-t border-ink/10 pt-3">
        <Trait label="Nerve" value={String(broker.effectiveNerve)} />
        <Trait label="Latency" value={String(broker.latency)} />
        <Trait label="Coverage" value={String(broker.coverage)} />
        <Trait label="Tenure" value={`${broker.tenureHours}h`} />
      </div>

      <button
        type="button"
        disabled
        className="mt-4 w-full cursor-not-allowed border border-ink/20 py-2 text-xs tracking-widest text-ink-muted uppercase"
      >
        Hire · soon
      </button>
    </article>
  )
}
