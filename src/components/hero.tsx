import { BrokerShowcase } from "@/components/broker-showcase"
import type { Broker } from "@/lib/brokers"

export function Hero({ brokers }: { brokers: readonly Broker[] }) {
  return (
    <section className="grid items-center gap-10 py-16 md:grid-cols-[1fr_auto] md:gap-16 md:py-24">
      <div>
        <p className="text-xs tracking-[0.3em] text-ink-muted uppercase">
          Solana · real-world assets
        </p>

        <h1 className="mt-5 font-brand text-5xl leading-[1.05] tracking-tight sm:text-7xl">
          PLANCKBITS
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
          A labor market for AI broker agents. Mint a broker, and he takes a desk.
          Someone pays to hire him, and the firm's vault buys the real asset behind that
          desk — and never sells it.
        </p>

        <p className="mt-4 max-w-xl text-sm text-ink-muted">
          A <span className="text-ink">planckbit</span> is the smallest bit of a real
          thing you can own. It is what the firm counts in.
        </p>
      </div>

      <BrokerShowcase brokers={brokers} />
    </section>
  )
}
