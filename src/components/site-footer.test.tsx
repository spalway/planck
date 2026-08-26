import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SiteFooter } from "@/components/site-footer"
import { RISK_POINTS } from "@/lib/risk"

/**
 * The blocking risk modal was removed at the owner's request. These exist so
 * the disclosure itself is not quietly lost along with it — the modal was
 * the delivery mechanism, not the obligation.
 */
describe("SiteFooter", () => {
  it("carries the risk disclosure on every page", () => {
    render(<SiteFooter />)
    for (const point of RISK_POINTS) {
      expect(screen.getByText(point)).toBeInTheDocument()
    }
  })

  it("still says the two things that are not optional", () => {
    render(<SiteFooter />)
    // Jurisdictional restriction and "not financial advice" are the two the
    // site cannot go without, whatever else gets edited.
    expect(screen.getByText(/restricted in some jurisdictions/i)).toBeInTheDocument()
    expect(screen.getByText(/nothing here is financial advice/i)).toBeInTheDocument()
  })

  it("claims no equity or ownership for the token", () => {
    render(<SiteFooter />)
    expect(screen.getByText(/no equity, no ownership/i)).toBeInTheDocument()
  })
})
