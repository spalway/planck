import { BrokerSprite } from "@/components/broker-sprite"
import { ROSTER } from "@/lib/brokers"
import { DESKS } from "@/lib/instruments"

/**
 * One broker, labelled as a sample.
 *
 * Drawn from the local fixture rather than the roster, so it renders in
 * exactly the state where nothing can be fetched — which is the only state
 * anyone sees it in. It is labelled because it is not a broker anyone owns:
 * an unlabelled portrait on an empty floor would read as the first mint.
 */

const SAMPLE = ROSTER[0]

function deskLabel(id: (typeof ROSTER)[number]["desk"]) {
  return DESKS.find((d) => d.id === id)?.label ?? id.toUpperCase()
}

export function SampleBroker({ size = 120 }: { size?: number }) {
  if (!SAMPLE) return null

  return (
    <figure className="panel mx-auto flex w-full max-w-[15rem] flex-col items-center gap-3 p-3">
      <figcaption className="tag self-start text-[0.55rem]">Sample</figcaption>

      <div className="panel-sunk w-full px-6 py-5">
        <div className="flex justify-center">
          <BrokerSprite broker={SAMPLE} size={size} />
        </div>
      </div>

      <div className="w-full border-t-2 border-ink/20 pt-2 text-center">
        <p className="font-display text-sm font-bold">{SAMPLE.name}</p>
        <p className="num mt-1 text-[0.65rem] text-ink-muted">
          <span className="text-cobalt">{deskLabel(SAMPLE.desk)}</span> desk
        </p>
      </div>
    </figure>
  )
}
