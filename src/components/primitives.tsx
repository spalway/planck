import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Shared page furniture.
 *
 * Structure here is real borders — thick umber rules, hard offset shadows and
 * SVG. Box-drawing characters are reserved for illustration and never used as
 * chrome.
 */

export function Section({
  id,
  label,
  title,
  children,
}: {
  id: string
  label: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="rule scroll-mt-24 py-14">
      <header className="mb-8 flex items-center gap-3">
        {/* The number is a filled block rather than grey small text: it reads
            as an index mark on a ledger, and it gives every section the same
            anchor at the same weight. */}
        <span className="num tag text-xs">{label}</span>
        <h2 className="font-display text-2xl tracking-tight sm:text-3xl">{title}</h2>
        {/* Fills the rest of the line so the heading reads as a ruled row. */}
        <span aria-hidden="true" className="h-0.5 flex-1 bg-ink/25" />
      </header>
      {children}
    </section>
  )
}

const TONE = {
  neutral: "text-ink",
  gain: "text-gain",
  loss: "text-loss",
} as const

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string
  value: string
  hint?: string
  tone?: keyof typeof TONE
}) {
  return (
    <div className="panel flex min-w-0 flex-col gap-1 p-3">
      <span className="text-[0.7rem] tracking-widest text-ink-muted uppercase">
        {label}
      </span>
      <span className={cn("num text-2xl font-bold", TONE[tone])}>{value}</span>
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </div>
  )
}
