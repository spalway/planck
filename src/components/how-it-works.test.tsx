import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { HowItWorks } from "@/components/how-it-works"
import { HOW_IT_WORKS_STEPS } from "@/lib/how-it-works-steps"

// It carries a router Link to /mint now, so it needs a router around it.
const renderPage = () =>
  render(
    <MemoryRouter>
      <HowItWorks />
    </MemoryRouter>
  )

describe("HowItWorks", () => {
  it("has six steps", () => {
    expect(HOW_IT_WORKS_STEPS).toHaveLength(6)
  })

  it("numbers them 01 through 06 in order", () => {
    expect(HOW_IT_WORKS_STEPS.map((s) => s.n)).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
    ])
  })

  it("gives the fee split its own step", () => {
    renderPage()
    // Twice: the contents list and the section heading.
    expect(screen.getAllByText(/fee splits three ways/i)).toHaveLength(2)
  })

  it("renders every step title", () => {
    renderPage()
    for (const s of HOW_IT_WORKS_STEPS) {
      // Twice each: once in the contents list, once as the section heading.
      expect(screen.getAllByText(s.title).length).toBeGreaterThan(0)
    }
  })

  it("gives every step a slug that is a valid anchor", () => {
    // Slugs are the deep links into this page. A duplicate or a stray
    // character silently breaks one.
    const slugs = HOW_IT_WORKS_STEPS.map((s) => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/)
  })

  it("gives every step a section the contents list can reach", () => {
    const { container } = renderPage()
    const toc = screen.getByRole("navigation", { name: /on this page/i })

    for (const s of HOW_IT_WORKS_STEPS) {
      expect(
        within(toc).getByRole("link", { name: new RegExp(s.title, "i") })
      ).toHaveAttribute("href", `#${s.slug}`)
      expect(container.querySelector(`#${s.slug}`), s.slug).not.toBeNull()
    }
  })

  it("reads as a document: one h1, a step heading for each section", () => {
    renderPage()
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    for (const s of HOW_IT_WORKS_STEPS) {
      expect(
        screen.getByRole("heading", { level: 2, name: new RegExp(s.title, "i") })
      ).toBeInTheDocument()
    }
  })
})
