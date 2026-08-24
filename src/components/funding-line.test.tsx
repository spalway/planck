import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FundingLine } from "@/components/funding-line"

const CA = "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6"

describe("FundingLine", () => {
  it("states the CA when there is one", () => {
    render(<FundingLine ca={CA} />)
    expect(screen.getByText(/A1KLoBrK/)).toBeInTheDocument()
  })

  it("says the token is not live yet when there is no CA", () => {
    render(<FundingLine ca={null} />)
    expect(screen.getByText(/not live/i)).toBeInTheDocument()
  })

  it("shows no price, chart or ticker", () => {
    const { container } = render(<FundingLine ca={CA} />)
    expect(container.textContent).not.toMatch(/\$\d/)
    expect(container.querySelector("svg")).toBeNull()
  })
})
