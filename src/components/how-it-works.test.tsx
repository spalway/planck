import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { HowItWorks } from "@/components/how-it-works"
import { HOW_IT_WORKS_STEPS } from "@/lib/how-it-works-steps"

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
    render(<HowItWorks />)
    expect(screen.getByText(/fee splits three ways/i)).toBeInTheDocument()
  })

  it("renders every step title", () => {
    render(<HowItWorks />)
    for (const s of HOW_IT_WORKS_STEPS) {
      expect(screen.getByText(s.title)).toBeInTheDocument()
    }
  })
})
