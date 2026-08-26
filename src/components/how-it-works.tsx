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
    body: "A hiring fee in $PLANCK engages him for a fixed term. You never hand him custody of anything; the fee is the only thing that moves from the hirer.",
  },
  {
    n: "04",
    title: "The fee splits three ways",
    body: "Most of it goes to the broker's owner, a share funds the house vault, and the rest is burned. Owning a broker other people want to hire is the business.",
  },
  {
    n: "05",
    title: "The vault buys",
    body: "The vault's allocation goes into his desk's instruments and the cost basis is stamped on chain. The vault holds what it buys. It does not sell.",
  },
  {
    n: "06",
    title: "The record stands",
    body: "His track record is live price against recorded basis — arithmetic on public data, not a claim we make. It follows him permanently, and it is what makes him worth hiring again.",
  },
]

export function HowItWorks() {
  return (
    <Section id="how" label="05" title="HOW IT WORKS">
      {/* 2px gaps over an umber ground: the steps read as cells ruled off on
          one sheet, which is what a numbered sequence should look like. */}
      <ol className="panel grid grid-cols-1 gap-0.5 bg-umber md:grid-cols-2 lg:grid-cols-3">
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

export const HOW_IT_WORKS_STEPS = STEPS
