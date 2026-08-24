import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  DisclaimerGate,
  GATE_STORAGE_KEY,
  hasAcceptedGate,
} from "@/components/disclaimer-gate"

beforeEach(() => localStorage.clear())

describe("DisclaimerGate", () => {
  it("keeps the accept button disabled until the box is ticked", () => {
    render(<DisclaimerGate onAccept={() => {}} />)
    const accept = screen.getByRole("button", { name: /understand/i })
    expect(accept).toBeDisabled()

    fireEvent.click(screen.getByRole("checkbox"))
    expect(accept).toBeEnabled()
  })

  it("calls onAccept and persists once accepted", () => {
    const onAccept = vi.fn()
    render(<DisclaimerGate onAccept={onAccept} />)

    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: /understand/i }))

    expect(onAccept).toHaveBeenCalledOnce()
    expect(localStorage.getItem(GATE_STORAGE_KEY)).toBe("1")
  })

  it("states the three risks the spec requires", () => {
    render(<DisclaimerGate onAccept={() => {}} />)
    expect(screen.getByText(/experimental/i)).toBeInTheDocument()
    expect(screen.getByText(/is financial advice/i)).toBeInTheDocument()
    expect(screen.getByText(/jurisdiction/i)).toBeInTheDocument()
  })
})

describe("hasAcceptedGate", () => {
  it("is false before acceptance and true after", () => {
    expect(hasAcceptedGate()).toBe(false)
    localStorage.setItem(GATE_STORAGE_KEY, "1")
    expect(hasAcceptedGate()).toBe(true)
  })
})
