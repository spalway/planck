import { describe, expect, it } from "vitest"

import { cn } from "@/lib/utils"

describe("cn", () => {
  it("merges conflicting tailwind classes, last wins", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })

  it("drops falsy values", () => {
    expect(cn("text-ink", false, undefined, "num")).toBe("text-ink num")
  })
})
