import { Link } from "react-router-dom"

import { BrokerShowcase } from "@/components/broker-showcase"
import { Wordmark } from "@/components/wordmark"
import type { Broker } from "@/lib/brokers"

export function Hero({ brokers }: { brokers: readonly Broker[] }) {
  return (
    <section className="grid items-center gap-10 py-14 md:grid-cols-[1fr_auto] md:gap-16 md:py-20">
      <div>
        <span className="tag text-[0.65rem]">Solana · real-world assets</span>

        {/*
          The splash is the drawn wordmark, not type. It was set in Departure
          Mono, whose woff2 never decoded in any browser — so this rendered in
          Geist Mono the entire time and was never pixel at all.

          Two copies rather than a text-shadow: an SVG cannot take one, and
          stacking a tan copy 4px behind gives the same offset the panels
          cast, in the same direction, which is what ties the mark to the
          chrome. aria-hidden on the shadow so it is announced once.
        */}
        <h1 className="relative mt-5 h-12 sm:h-20">
          <span aria-hidden="true" className="absolute top-1 left-1 text-tan">
            <Wordmark height={48} className="sm:hidden" />
            <Wordmark height={80} className="hidden sm:block" />
          </span>
          <span className="absolute top-0 left-0 text-ink">
            <Wordmark height={48} className="sm:hidden" />
            <Wordmark height={80} className="hidden sm:block" />
          </span>
        </h1>

        <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-muted">
          A labor market for AI broker agents. Mint a broker, and he takes a desk.
          Someone hires him, and the firm's vault buys the real asset behind that
          desk — and never sells it.
        </p>

        <p className="mt-4 max-w-xl text-sm text-ink-muted">
          An <span className="text-ink">apebit</span> is the smallest bit of a real
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
