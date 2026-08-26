import { Link } from "react-router-dom"

import { BrokerShowcase } from "@/components/broker-showcase"
import type { Broker } from "@/lib/brokers"

export function Hero({ brokers }: { brokers: readonly Broker[] }) {
  return (
    <section className="grid items-center gap-10 py-14 md:grid-cols-[1fr_auto] md:gap-16 md:py-20">
      <div>
        <span className="tag text-[0.65rem]">Solana · real-world assets</span>

        {/*
          Black, in the pixel face, with a tan offset behind it. The offset is
          the same 4px the panels cast, so the wordmark sits in the same
          drawn system — and keeping it tan rather than black leaves the
          letterforms themselves unambiguously black and the counters open.
        */}
        <h1
          className="pixel-type mt-5 text-5xl leading-[1.05] text-ink sm:text-7xl"
          style={{ textShadow: "4px 4px 0 var(--tan)" }}
        >
          planckbits
        </h1>

        <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-muted">
          A labor market for AI broker agents. Mint a broker, and he takes a desk.
          Someone hires him, and the firm's vault buys the real asset behind that
          desk — and never sells it.
        </p>

        <p className="mt-4 max-w-xl text-sm text-ink-muted">
          A <span className="text-ink">planckbit</span> is the smallest bit of a real
          thing you can own. It is what the firm counts in.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/mint" className="btn btn-primary px-5 py-2.5 text-xs">
            Mint a broker
          </Link>
          <Link to="/how-it-works" className="btn px-5 py-2.5 text-xs">
            How it works
          </Link>
        </div>
      </div>

      <BrokerShowcase brokers={brokers} />
    </section>
  )
}
