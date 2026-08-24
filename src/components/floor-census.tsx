import { Section, Stat } from "@/components/primitives"
import type { Broker } from "@/lib/brokers"
import { DESKS } from "@/lib/instruments"

export function FloorCensus({ brokers }: { brokers: readonly Broker[] }) {
  const employed = brokers.filter((b) => b.tenureHours > 0).length
  const covered = new Set(brokers.map((b) => b.desk)).size

  return (
    <Section id="floor" label="01" title="THE FLOOR">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="Brokers" value={String(brokers.length)} />
        <Stat label="Employed" value={String(employed)} hint="tenure accruing" />
        <Stat
          label="Idle"
          value={String(brokers.length - employed)}
          hint="available to hire"
        />
        <Stat label="Desks covered" value={`${covered} / ${DESKS.length}`} />
      </div>
    </Section>
  )
}
