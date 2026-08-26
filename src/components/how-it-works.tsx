import { Section } from "@/components/primitives"
import { STEPS } from "@/lib/how-it-works-steps"

export function HowItWorks() {
  return (
    <Section id="how" label="05" title="how it works">
      {/* 2px gaps over an umber ground: the steps read as cells ruled off on
          one sheet, which is what a numbered sequence should look like. */}
      <ol className="panel grid grid-cols-1 gap-0.5 bg-ink md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="flex min-w-0 flex-col bg-paper p-5">
            <span className="num tag self-start text-[0.6rem]">{s.n}</span>
            <h3 className="mt-3 font-display text-base font-bold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
