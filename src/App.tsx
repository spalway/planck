import * as React from "react"
import { Route, Routes, useLocation } from "react-router-dom"

import { DisclaimerGate, hasAcceptedGate } from "@/components/disclaimer-gate"
import { FundingLine } from "@/components/funding-line"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { WalletProvider } from "@/components/wallet-context"
import { AssetsPage } from "@/pages/assets"
import { BrokersPage } from "@/pages/brokers"
import { HoldingsPage } from "@/pages/holdings"
import { HomePage } from "@/pages/home"
import { HowItWorksPage } from "@/pages/how-it-works"
import { NotFoundPage } from "@/pages/not-found"
import { PLANCK_CA } from "@/lib/vault"

/** Router keeps scroll position across navigations; a new page should start at the top. */
function ScrollToTop() {
  const { pathname } = useLocation()
  React.useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

export function App() {
  const [entered, setEntered] = React.useState(hasAcceptedGate)

  return (
    <WalletProvider>
      <div className="flex min-h-dvh flex-col">
        {!entered && <DisclaimerGate onAccept={() => setEntered(true)} />}
        <ScrollToTop />
        <SiteHeader />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/brokers" element={<BrokersPage />} />
            <Route path="/holdings" element={<HoldingsPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>

          <FundingLine ca={PLANCK_CA} />
        </main>

        <SiteFooter />
      </div>
    </WalletProvider>
  )
}
