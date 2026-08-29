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

/** Class list as a set, so `bg-ground` never matches `hover:bg-ground/15`. */
function classes(name: string): string[] {
  return screen.getByRole("link", { name }).className.split(/\s+/)
}

  it("marks the current page as active", () => {
    header("/brokers")
    // The active page is a filled block. Asserting the fill rather than a
    // text colour, because a tint alone was too easy to miss at this size.
    expect(classes("Brokers")).toContain("bg-ground")
  })

  it("does not mark Home active on a sub-route", () => {
    // Without `end`, "/" matches every path and Home never switches off.
    header("/brokers")
    expect(classes("Home")).not.toContain("bg-ground")
  })

  it("draws the wordmark and sets the links in the label face", () => {
    header()
    // The wordmark is an SVG, not type — the pixel woff2 it used to rely on
    // never decoded in any browser. It is reachable by its accessible name.
    expect(screen.getByRole("img", { name: /stockbits/i })).toBeInTheDocument()
    for (const name of ["Home", "Brokers"]) {
      expect(classes(name)).toContain("font-bold")
    }
  })

  it("offers a live connect action", () => {
    // Was a disabled "Connect · soon" placeholder; wallet connect now works.
    header()
    expect(screen.getByRole("button", { name: "connect" })).toBeEnabled()
  })
})
