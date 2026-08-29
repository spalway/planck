import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ErrorBoundary } from "@/components/error-boundary"

function Boom(): React.ReactNode {
  throw new Error("kaboom")
}

// React logs caught errors to console.error; silence it so a passing run is
// not full of red noise.
beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

describe("ErrorBoundary", () => {
  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>all fine</p>
      </ErrorBoundary>
    )
    expect(screen.getByText("all fine")).toBeInTheDocument()
  })

  it("catches a render crash instead of blanking the page", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByText(/something broke/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /reload/i })).toBeInTheDocument()
  })

  it("logs the failure so it is diagnosable", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    expect(console.error).toHaveBeenCalledWith(
      "[APEBITS] render error:",
      expect.any(Error),
      expect.anything()
    )
  })

  it("recovers when remounted under a new key", () => {
    // App keys the boundary by pathname, so navigating away from a crashed
    // page must clear the error rather than latching on it.
    const { rerender } = render(
      <ErrorBoundary key="/broken">
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByText(/something broke/i)).toBeInTheDocument()

    rerender(
      <ErrorBoundary key="/fine">
        <p>next page</p>
      </ErrorBoundary>
    )
    expect(screen.getByText("next page")).toBeInTheDocument()
  })
})
