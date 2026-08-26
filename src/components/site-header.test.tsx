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

  it("sets the wordmark in the pixel face and the links in the label face", () => {
    header()
    // Only the wordmark is pixel type. Links in the same face would read as
    // a second logotype competing with the first.
    expect(screen.getByRole("link", { name: "planckbits" }).className).toContain(
      "pixel-type",
    )
    for (const name of ["Home", "Brokers"]) {
      expect(classes(name)).toContain("font-bold")
      expect(classes(name)).not.toContain("pixel-type")
    }
  })

  it("offers a live connect action", () => {
    // Was a disabled "Connect · soon" placeholder; wallet connect now works.
    header()
    expect(screen.getByRole("button", { name: "connect" })).toBeEnabled()
  })
})
