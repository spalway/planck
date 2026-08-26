import * as React from "react"

import { BrokerSprite } from "@/components/broker-sprite"
import { Section } from "@/components/primitives"
import { useWalletContext } from "@/components/wallet-context"
import { useHolding } from "@/hooks/use-holding"
import type { Broker } from "@/lib/brokers"
import type { DeskId } from "@/lib/instruments"
import { mintBroker, type MintResult, type MintedBroker } from "@/lib/token-api"

/**
 * Mint a broker.
 *
 * Gated on holding $PLANCK, which is the token's only job in the product. The
 * gate is enforced server-side; this page only decides what to say about it.
 */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel p-6 text-sm leading-relaxed text-ink-muted">
      {children}
    </div>
  )
}

/** The API row shape into the Broker the sprite renderer expects. */
function toBroker(m: MintedBroker): Broker {
  return {
    id: m.id,
    name: m.name,
    desk: m.desk as DeskId,
    nerve: m.nerve,
    latency: m.latency,
    coverage: m.coverage,
    effectiveNerve: m.effective_nerve,
    tenureHours: m.tenure_hours ?? 0,
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-t border-umber/15 py-1.5">
      <span className="text-[0.65rem] tracking-widest text-ink-muted uppercase">
        {label}
      </span>
      <span className="num text-sm">{value}</span>
    </div>
  )
}

function Minted({ broker }: { broker: Broker }) {
  return (
    <div className="panel flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
      <BrokerSprite broker={broker} size={120} />

      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] tracking-widest text-cobalt uppercase">
          Hired onto the floor
        </p>
        <h3 className="mt-1 font-display text-lg">{broker.name}</h3>
        <p className="num text-xs text-ink-muted">{broker.id}</p>

        <div className="mt-4">
          <Stat label="Desk" value={broker.desk.toUpperCase()} />
          <Stat label="Nerve" value={String(broker.effectiveNerve)} />
          <Stat label="Latency" value={String(broker.latency)} />
          <Stat label="Coverage" value={String(broker.coverage)} />
        </div>
      </div>
    </div>
  )
}

export function MintPage() {
  const { address } = useWalletContext()
  const holding = useHolding()

  const [minting, setMinting] = React.useState(false)
  const [result, setResult] = React.useState<MintResult | null>(null)

  async function mint() {
    if (address === null) return
    setMinting(true)
    setResult(await mintBroker(address))
    setMinting(false)
  }

  return (
    <Section id="mint" label="06" title="MINT A BROKER">
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-ink-muted">
        Traits roll on mint and cannot be re-rolled. The desk is weighted by how many
        instruments it carries, and surplus coverage on a shallow desk converts to nerve
        — so no roll is wasted.
      </p>

      <div className="flex flex-col gap-4">
        {holding.status === "disconnected" && (
          <Panel>Connect a wallet to mint. The button is in the header.</Panel>
        )}

        {holding.status === "checking" && <Panel>Checking your wallet…</Panel>}

        {holding.status === "unavailable" && holding.reason === "not_launched" && (
          <Panel>
            $PLANCK has not launched yet, so there is nothing to hold and nothing to
            mint. This page opens when the token does.
          </Panel>
        )}

        {holding.status === "unavailable" && holding.reason === "unavailable" && (
          <Panel>
            We could not check your wallet just now. That is our problem, not yours —
            try again shortly.
          </Panel>
        )}

        {holding.status === "known" && !holding.holding.holds && (
          <Panel>
            This wallet holds no $PLANCK. Minting is open to holders; the contract
            address is at the foot of every page.
          </Panel>
        )}

        {holding.status === "known" && holding.holding.holds && (
          <>
            <Panel>
              Holding confirmed —{" "}
              <span className="num text-ink">
                {holding.holding.amount.toLocaleString("en-US")}
              </span>{" "}
              $PLANCK. You may mint.
            </Panel>

            <button
              type="button"
              onClick={mint}
              disabled={minting}
              className="btn btn-primary w-full max-w-xs py-3 text-xs disabled:cursor-wait"
            >
              {minting ? "Rolling…" : "Mint a broker"}
            </button>
          </>
        )}

        {result?.ok === true && <Minted broker={toBroker(result.broker)} />}

        {result?.ok === false && (
          <Panel>
            {result.reason === "mint_cap_reached"
              ? `This wallet has already minted the maximum of ${result.cap ?? 5} brokers.`
              : result.reason === "not_holding"
                ? "That wallet no longer holds $PLANCK."
                : "The mint did not go through. Nothing was charged — try again."}
          </Panel>
        )}
      </div>
    </Section>
  )
}
