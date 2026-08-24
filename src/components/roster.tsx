import * as React from "react"

import { BrokerCard } from "@/components/broker-card"
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
        "border px-3 py-1 text-[0.65rem] tracking-widest uppercase",
        active
          ? "border-cobalt bg-cobalt text-white"
          : "border-ink/20 text-ink-muted hover:border-ink/40"
      )}
    >
      {children}
    </button>
  )
}

export function Roster({ brokers }: { brokers: readonly Broker[] }) {
  const [sort, setSort] = React.useState<SortKey>("tenure")
  const [desk, setDesk] = React.useState<DeskId | "all">("all")

  const shown = React.useMemo(() => {
    const filtered =
      desk === "all" ? [...brokers] : brokers.filter((b) => b.desk === desk)
    return filtered.sort((a, b) => compare(a, b, sort))
  }, [brokers, desk, sort])

  return (
    <Section id="roster" label="03" title="THE ROSTER">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Chip active={desk === "all"} onClick={() => setDesk("all")}>
          All
        </Chip>
        {DESKS.map((d) => (
          <Chip key={d.id} active={desk === d.id} onClick={() => setDesk(d.id)}>
            {d.label}
          </Chip>
        ))}

        <span className="ml-auto text-[0.65rem] tracking-widest text-ink-muted uppercase">
          Sort
        </span>
        {SORTS.map((s) => (
          <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>
            {s.label}
          </Chip>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="border border-ink/15 p-6 text-sm text-ink-muted">
          No brokers on this desk yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((b) => (
            <BrokerCard key={b.id} broker={b} />
          ))}
        </div>
      )}
    </Section>
  )
}
