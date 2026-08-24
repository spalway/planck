import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Shared page furniture.
 *
 * Structure here is real borders — 1px ink rules and SVG. Box-drawing
 * characters are reserved for illustration and never used as chrome.
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
    <section id={id} className="scroll-mt-24 border-t border-ink/15 py-14">
      <header className="mb-8 flex items-baseline gap-4">
        <span className="num text-xs text-ink-muted">{label}</span>
        <h2 className="font-display text-2xl tracking-tight sm:text-3xl">{title}</h2>
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
    <div className="flex flex-col gap-1 border-l border-ink/15 pl-4">
      <span className="text-[0.7rem] tracking-widest text-ink-muted uppercase">
        {label}
      </span>
      <span className={cn("num text-2xl", TONE[tone])}>{value}</span>
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </div>
  )
}
