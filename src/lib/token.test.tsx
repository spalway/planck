import { afterEach, describe, expect, it, vi } from "vitest"

const MINT = "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6"

async function load(value: string | undefined) {
  vi.resetModules()
  if (value === undefined) vi.stubEnv("VITE_PLANCK_MINT", "")
  else vi.stubEnv("VITE_PLANCK_MINT", value)
  return import("@/lib/token")
}

afterEach(() => vi.unstubAllEnvs())

/**
 * The address lived in three places at once — VITE_PLANCK_CA in the contract
 * section, a hardcoded null in lib/vault.ts, and PLANCK_MINT on the server.
 * Setting it would have shown the address in one place and "not live yet" in
 * another on the same page. There is one source now, and these keep it that
 * way.
 */
describe("PLANCK_MINT", () => {
  it("is null before launch so the UI can branch on it", async () => {
    const { PLANCK_MINT, tokenLaunched } = await load("")
    expect(PLANCK_MINT).toBeNull()
    expect(tokenLaunched()).toBe(false)
  })

  it("treats whitespace as unset rather than as an address", async () => {
    // A Railway variable saved with a stray space would otherwise render as
    // a live token whose address is blank.
    const { PLANCK_MINT } = await load("   ")
    expect(PLANCK_MINT).toBeNull()
  })

  it("trims an address that arrives padded", async () => {
    const { PLANCK_MINT } = await load(` ${MINT} `)
    expect(PLANCK_MINT).toBe(MINT)
  })

  it("exposes the configured address", async () => {
    const { PLANCK_MINT, tokenLaunched } = await load(MINT)
    expect(PLANCK_MINT).toBe(MINT)
    expect(tokenLaunched()).toBe(true)
  })
})

describe("the whole site agrees about the address", () => {
  it("shows it in the contract section and the funding line together", async () => {
    vi.resetModules()
    vi.stubEnv("VITE_PLANCK_MINT", MINT)

    const { render } = await import("@testing-library/react")
    const { PLANCK_MINT } = await import("@/lib/token")
    const { ContractSection } = await import("@/components/contract-section")
    const { FundingLine } = await import("@/components/funding-line")

    const contract = render(<ContractSection />)
    expect(contract.container.textContent).toContain(MINT)

    const funding = render(<FundingLine mint={PLANCK_MINT} />)
    expect(funding.container.textContent).toContain(MINT)
    // The bug this replaces: one of these said "not live yet" while the
    // other printed the address.
    expect(funding.container.textContent).not.toMatch(/not live yet/i)
  })
})
