import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Section, Stat } from "@/components/primitives"

describe("Stat", () => {
  it("renders label and value", () => {
    render(<Stat label="TERMINALS" value="4,444" />)
    expect(screen.getByText("TERMINALS")).toBeInTheDocument()
    expect(screen.getByText("4,444")).toBeInTheDocument()
  })

  it("colours a gain", () => {
    render(<Stat label="P&L" value="+25.00%" tone="gain" />)
    expect(screen.getByText("+25.00%").className).toContain("text-gain")
  })

  it("colours a loss", () => {
    render(<Stat label="P&L" value="-25.00%" tone="loss" />)
    expect(screen.getByText("-25.00%").className).toContain("text-loss")
  })

  it("uses tabular figures for every value", () => {
    render(<Stat label="X" value="123" />)
    expect(screen.getByText("123").className).toContain("num")
  })

  it("renders an optional hint", () => {
    render(<Stat label="X" value="1" hint="since inception" />)
    expect(screen.getByText("since inception")).toBeInTheDocument()
  })
})

describe("Section", () => {
  it("renders its label, title and children under an addressable id", () => {
    const { container } = render(
      <Section id="desks" label="02" title="THE DESKS">
        <p>body</p>
      </Section>,
    )
    expect(screen.getByText("THE DESKS")).toBeInTheDocument()
    expect(screen.getByText("02")).toBeInTheDocument()
    expect(screen.getByText("body")).toBeInTheDocument()
    expect(container.querySelector("#desks")).not.toBeNull()
  })
})
