import * as React from "react"
import { Route, Routes, useLocation } from "react-router-dom"

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
import { MintPage } from "@/pages/mint"
import { NotFoundPage } from "@/pages/not-found"
import { PLANCK_MINT } from "@/lib/token"

export function App() {
  const { pathname } = useLocation()

  // Router keeps scroll position across navigations; a new page starts at the top.
  //
  // The block body is load-bearing. Written concisely — `() => window.scrollTo(0, 0)`
  // — the arrow RETURNS whatever scrollTo returns, and React stores an effect's
  // return value as its cleanup and calls it if it is anything but undefined.
  // scrollTo returns undefined in a clean page, but this one runs with wallet
  // extensions injected, and extensions patch scroll methods. A patched
  // scrollTo returning any value made React call a non-function while
  // unmounting, which throws during commit and tears down the whole tree.
  //
  // This effect keys on pathname, so that was every single navigation: the
  // page went blank on every click and only a reload brought it back.
  React.useEffect(() => {
    try {
      window.scrollTo(0, 0)
    } catch {
      // Scrolling is a nicety. It must never be able to take the page down.
    }
  }, [pathname])

  return (
    <WalletProvider>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />

        <main className="mx-auto w-full max-w-[88rem] flex-1 px-4">
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
              <Route path="/mint" element={<MintPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ErrorBoundary>

          <FundingLine mint={PLANCK_MINT} />
        </main>

        <SiteFooter />
      </div>
    </WalletProvider>
  )
}
