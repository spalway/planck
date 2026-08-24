import * as React from "react"

import { DeskBoard } from "@/components/desk-board"
import { DisclaimerGate, hasAcceptedGate } from "@/components/disclaimer-gate"
import { FloorCensus } from "@/components/floor-census"
import { FundingLine } from "@/components/funding-line"
import { Hero } from "@/components/hero"
import { HowItWorks } from "@/components/how-it-works"
import { Roster } from "@/components/roster"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { VaultRecord } from "@/components/vault-record"
import { ROSTER } from "@/lib/brokers"
import { PLANCK_CA, VAULT_HOLDINGS } from "@/lib/vault"

export function App() {
  const [entered, setEntered] = React.useState(hasAcceptedGate)

  return (
    <div id="top">
      {!entered && <DisclaimerGate onAccept={() => setEntered(true)} />}
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4">
        <Hero />
        <FloorCensus brokers={ROSTER} />
        <DeskBoard brokers={ROSTER} holdings={VAULT_HOLDINGS} />
        <Roster brokers={ROSTER} />
        <VaultRecord holdings={VAULT_HOLDINGS} />
        <HowItWorks />
        <FundingLine ca={PLANCK_CA} />
      </main>
      <SiteFooter />
    </div>
  )
}
