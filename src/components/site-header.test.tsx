import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { SiteHeader } from "@/components/site-header"
import { ROUTES } from "@/lib/nav"

function header(at = "/") {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <SiteHeader />
    </MemoryRouter>
  )
}

describe("SiteHeader", () => {
  it("links to every route", () => {
    header()
    for (const r of ROUTES) {
      expect(screen.getByRole("link", { name: r.label })).toHaveAttribute(
        "href",
        r.path
      )
    }
  })

  it("marks the current page as active", () => {
    header("/brokers")
    expect(screen.getByRole("link", { name: "Brokers" }).className).toContain(
      "text-cobalt"
    )
  })

  it("does not mark Home active on a sub-route", () => {
    // Without `end`, "/" matches every path and Home never switches off.
    header("/brokers")
    expect(screen.getByRole("link", { name: "Home" }).className).toContain(
      "text-ink-muted"
    )
  })

  it("keeps connect disabled until launch", () => {
    header()
    expect(screen.getByRole("button", { name: /connect/i })).toBeDisabled()
  })
})
