import * as React from "react"

import { BrokerCard } from "@/components/broker-card"
import { EmptyFloor } from "@/components/empty-floor"
import { Section } from "@/components/primitives"
import type { Broker } from "@/lib/brokers"
import { DESKS, type DeskId } from "@/lib/instruments"
import { cn } from "@/lib/utils"

export type SortKey = "tenure" | "nerve" | "latency"

const SORTS: { key: SortKey; label: string }[] = [
  { key: "tenure", label: "Tenure" },
  { key: "nerve", label: "Nerve" },
  { key: "latency", label: "Latency" },
]

/** Latency sorts ascending — a lower number means faster deployment. */
function compare(a: Broker, b: Broker, key: SortKey): number {
  if (key === "latency") return a.latency - b.latency
  if (key === "nerve") return b.effectiveNerve - a.effectiveNerve
  return b.tenureHours - a.tenureHours
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border px-3 py-1 text-[0.65rem] tracking-widest",
        active
          ? "border-ink bg-ink text-ground"
          : "border-ink/30 text-ink-muted hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </button>
  )
}

export function Roster({
  brokers,
  failed = false,
}: {
  brokers: readonly Broker[]
  failed?: boolean
}) {
  const [sort, setSort] = React.useState<SortKey>("tenure")
  const [desk, setDesk] = React.useState<DeskId | "all">("all")

  const shown = React.useMemo(() => {
    const filtered =
      desk === "all" ? [...brokers] : brokers.filter((b) => b.desk === desk)
    return filtered.sort((a, b) => compare(a, b, sort))
  }, [brokers, desk, sort])

  // Below every hook, not above useMemo: an early return there is a
  // conditional hook call, and the hook count would change the moment the
  // roster went from empty to loaded.
  //
  // Distinct from "no brokers on this desk": nobody is on any desk, so the
  // filter and sort chips have nothing to act on and would just be furniture.
  if (brokers.length === 0) {
    return (
      <Section id="brokers" label="03" title="brokers">
        <EmptyFloor failed={failed} />
      </Section>
    )
  }

  return (
    <Section id="brokers" label="03" title="brokers">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Chip active={desk === "all"} onClick={() => setDesk("all")}>
          All
        </Chip>
        {DESKS.map((d) => (
          <Chip key={d.id} active={desk === d.id} onClick={() => setDesk(d.id)}>
            {d.label}
          </Chip>
        ))}

        <span className="ml-auto text-[0.65rem] tracking-widest text-ink-muted">
          Sort
        </span>
        {SORTS.map((s) => (
          <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>
            {s.label}
          </Chip>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="panel-flat p-6 text-sm text-ink-muted">
          No brokers on this desk yet.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-4">
          {shown.map((b) => (
            <BrokerCard key={b.id} broker={b} />
          ))}
        </div>
      )}
    </Section>
  )
}
