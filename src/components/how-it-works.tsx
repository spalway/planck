import { Section } from "@/components/primitives"

const STEPS = [
  {
    n: "01",
    title: "Mint a broker",
    body: "Traits roll on mint: a desk, plus nerve, latency and coverage. Every one drives a mechanic. Surplus coverage on a small desk converts to nerve, so no roll is wasted.",
  },
  {
    n: "02",
    title: "He takes a desk",
    body: "The desk decides which real instruments he can touch — tokenized equity, index, bullion, treasuries or private credit. All of it settles on Solana.",
  },
  {
    n: "03",
    title: "Someone hires him",
    body: "A hiring fee in $PLANCK engages him for a term. The fee splits between the broker's owner, the house vault, and a burn.",
  },
  {
    n: "04",
    title: "The vault buys",
    body: "The vault's allocation goes into his desk's instruments and the cost basis is stamped on chain. The vault holds what it buys. It does not sell.",
  },
  {
    n: "05",
    title: "The record stands",
    body: "His track record is live price against recorded basis — arithmetic on public data, not a claim we make. It follows him permanently.",
  },
]

export function HowItWorks() {
  return (
    <Section id="how" label="05" title="HOW IT WORKS">
      <ol className="grid grid-cols-1 gap-px border border-ink/15 bg-ink/15 md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="bg-paper p-5">
            <span className="num text-xs text-cobalt">{s.n}</span>
            <h3 className="mt-2 font-display text-base">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
