import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { SiteHeader } from "@/components/site-header"
import { WalletProvider } from "@/components/wallet-context"
import { ROUTES } from "@/lib/nav"

function header(at = "/") {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <WalletProvider>
        <SiteHeader />
      </WalletProvider>
    </MemoryRouter>,
  )
}

describe("SiteHeader", () => {
  it("links to every route", () => {
    header()
    for (const r of ROUTES) {
      expect(screen.getByRole("link", { name: r.label })).toHaveAttribute(
        "href",
        r.path,
      )
    }
  })

  it("marks the current page as active", () => {
    header("/brokers")
    // The active page is a filled block. Asserting the fill rather than a
    // text colour, because a tint alone was too easy to miss at this size.
    expect(screen.getByRole("link", { name: "Brokers" }).className).toContain(
      "bg-umber",
    )
  })

  it("does not mark Home active on a sub-route", () => {
    // Without `end`, "/" matches every path and Home never switches off.
    header("/brokers")
    expect(screen.getByRole("link", { name: "Home" }).className).toContain(
      "text-ink-muted",
    )
  })

  it("offers a live connect action", () => {
    // Was a disabled "Connect · soon" placeholder; wallet connect now works.
    header()
    expect(screen.getByRole("button", { name: "Connect" })).toBeEnabled()
  })
})
