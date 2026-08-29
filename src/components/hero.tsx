import { Link } from "react-router-dom"

import { BrokerShowcase } from "@/components/broker-showcase"
import { ContractSection } from "@/components/contract-section"
import { Wordmark } from "@/components/wordmark"
import type { Broker } from "@/lib/brokers"

/**
 * One column, not two.
 *
 * This was `md:grid-cols-[1fr_auto]` with the portrait beside the text, which
 * worked while the page ran the full width of the screen. The page is a 700px
 * column now, and that split left the text side 370px wide — narrower than
 * the 468px wordmark, so the logotype was cut off mid-word on every desktop.
 * Stacking gives the mark the whole column.
 */
export function Hero({ brokers }: { brokers: readonly Broker[] }) {
  return (
    <section className="flex flex-col gap-10 py-14 md:py-20">
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
        <h1 className="relative mt-5 h-[49px] sm:h-[84px]">
          <span aria-hidden="true" className="absolute top-1 left-1 text-tan">
            <Wordmark height={49} className="sm:hidden" />
            <Wordmark height={84} className="hidden sm:block" />
          </span>
          <span className="absolute top-0 left-0 text-ink">
            <Wordmark height={49} className="sm:hidden" />
            <Wordmark height={84} className="hidden sm:block" />
          </span>
        </h1>

        <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-muted">
          A labor market for AI broker agents. Mint a broker, and he takes a desk.
          Someone hires him, and the firm's vault buys the real asset behind that
          desk — and never sells it.
        </p>

        <p className="mt-4 max-w-xl text-sm text-ink-muted">
          A <span className="text-ink">stockbit</span> is the smallest bit of a real
          thing you can own. It is what the firm counts in.
        </p>

        {/* The address comes before the buttons: it is what most visitors
            arrive looking for, and it used to sit below the whole hero. */}
        <div className="mt-8">
          <ContractSection />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/mint" className="btn btn-primary px-5 py-2.5 text-xs">
            Mint a broker
          </Link>
          <Link to="/how-it-works" className="btn px-5 py-2.5 text-xs">
            How it works
          </Link>
        </div>
      </div>

      {/* Capped, or the showcase stretches to the full column and the 168px
          portrait floats in the middle of a very wide, very short card.
          Centred in the column rather than left-aligned under the copy. */}
      <div className="mx-auto w-full max-w-[17rem]">
        <BrokerShowcase brokers={brokers} />
      </div>
    </section>
  )
}
