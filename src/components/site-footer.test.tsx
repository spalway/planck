import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SiteFooter } from "@/components/site-footer"

/**
 * The footer used to carry a five-point risk disclosure, and these tests
 * existed to stop it being quietly lost. It has now been removed deliberately
 * at the owner's request, so the tests assert the opposite: the footer is the
 * wordmark and one line, and nothing has crept back into it.
 */
describe("SiteFooter", () => {
  it("is the wordmark and one line", () => {
    render(<SiteFooter />)
    expect(screen.getByRole("img", { name: /stockbits/i })).toBeInTheDocument()
    expect(
      screen.getByText(/a labor market for ai broker agents/i)
    ).toBeInTheDocument()
  })

  it("no longer carries the risk disclosure", () => {
    render(<SiteFooter />)
    expect(screen.queryByText(/restricted in some jurisdictions/i)).toBeNull()
    expect(screen.queryByText(/nothing here is financial advice/i)).toBeNull()
    expect(screen.queryByText(/no equity, no ownership/i)).toBeNull()
    expect(screen.queryByText(/unaudited/i)).toBeNull()
  })
})
