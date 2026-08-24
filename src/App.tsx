import * as React from "react"
import { Route, Routes, useLocation } from "react-router-dom"

import { DisclaimerGate, hasAcceptedGate } from "@/components/disclaimer-gate"
import { ErrorBoundary } from "@/components/error-boundary"
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

export function App() {
  const [entered, setEntered] = React.useState(hasAcceptedGate)
  const { pathname } = useLocation()

  // Router keeps scroll position across navigations; a new page starts at the top.
  React.useEffect(() => window.scrollTo(0, 0), [pathname])

  return (
    <WalletProvider>
      <div className="flex min-h-dvh flex-col">
        {!entered && <DisclaimerGate onAccept={() => setEntered(true)} />}
        <SiteHeader />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4">
          {/*
            Keyed by path so navigating away from a crashed page clears the
            error. An error boundary latches until it is remounted, so without
            this the nav would look broken after any single page threw.
          */}
          <ErrorBoundary key={pathname}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/brokers" element={<BrokersPage />} />
              <Route path="/holdings" element={<HoldingsPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ErrorBoundary>

          <FundingLine ca={PLANCK_CA} />
        </main>

        <SiteFooter />
      </div>
    </WalletProvider>
  )
}
