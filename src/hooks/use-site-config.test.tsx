import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const MINT = "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6"
const OTHER = "So11111111111111111111111111111111111111112"

/**
 * The contract address is runtime config, not a build-time constant.
 *
 * It used to be VITE_APE_MINT compiled into the bundle, so launching the
 * token required a rebuild and a redeploy — with the address wrong on the
 * site for the whole deploy, on the one day it matters most. It now comes
 * from public_config over /api/config.
 */

function respondWith(body: unknown, ok = true) {
  return vi.fn(async () => ({ ok, json: async () => body }))
}

beforeEach(() => vi.resetModules())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("useSiteConfig", () => {
  async function mount(env = "") {
    vi.stubEnv("VITE_APE_MINT", env)
    const { useSiteConfig } = await import("@/hooks/use-site-config")

    function Probe() {
      const { mint, loaded } = useSiteConfig()
      return (
        <div>
          <span data-testid="mint">{mint ?? "none"}</span>
          <span data-testid="loaded">{String(loaded)}</span>
        </div>
      )
    }
    render(<Probe />)
  }

  it("takes the address from the API", async () => {
    vi.stubGlobal("fetch", respondWith({ mint: MINT }))
    await mount()
    await waitFor(() => expect(screen.getByTestId("mint")).toHaveTextContent(MINT))
  })

  it("reports not-launched when the API returns null", async () => {
    vi.stubGlobal("fetch", respondWith({ mint: null }))
    await mount()
    await waitFor(() => expect(screen.getByTestId("loaded")).toHaveTextContent("true"))
    expect(screen.getByTestId("mint")).toHaveTextContent("none")
  })

  it("lets the database clear an address the build was compiled with", async () => {
    // Falling back to the build-time value here would resurrect an address
    // the database has deliberately unset.
    vi.stubGlobal("fetch", respondWith({ mint: null }))
    await mount(OTHER)
    await waitFor(() => expect(screen.getByTestId("mint")).toHaveTextContent("none"))
  })

  it("shows the build-time value immediately, before the fetch lands", async () => {
    // Otherwise a deploy that knows its own address still flashes
    // "not live yet" on first paint.
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))
    await mount(MINT)
    expect(screen.getByTestId("mint")).toHaveTextContent(MINT)
  })

  it("keeps the last known address when the lookup fails", async () => {
    // A config endpoint being down is not evidence the token does not exist.
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network") }))
    await mount(MINT)
    await waitFor(() => expect(screen.getByTestId("loaded")).toHaveTextContent("true"))
    expect(screen.getByTestId("mint")).toHaveTextContent(MINT)
  })

  it("treats a whitespace-only value as unset", async () => {
    // A Railway variable or a SQL update saved with a stray space would
    // otherwise render as a live token whose address is blank.
    vi.stubGlobal("fetch", respondWith({ mint: "   " }))
    await mount()
    await waitFor(() => expect(screen.getByTestId("mint")).toHaveTextContent("none"))
  })
})

describe("the whole site agrees about the address", () => {
  it("shows it in the contract section and the funding line together", async () => {
    vi.stubEnv("VITE_APE_MINT", "")
    vi.stubGlobal("fetch", respondWith({ mint: MINT }))

    const { ContractSection } = await import("@/components/contract-section")
    const { FundingLine } = await import("@/components/funding-line")
    const { useSiteConfig } = await import("@/hooks/use-site-config")

    function Both() {
      const { mint } = useSiteConfig()
      return (
        <>
          <ContractSection />
          <FundingLine mint={mint} />
        </>
      )
    }

    const { container } = render(<Both />)

    // The bug this replaces: one printed the address while the other said
    // "not live yet", because they read from different sources.
    await waitFor(() => {
      expect(container.textContent).toContain(MINT)
      expect(container.textContent).not.toMatch(/not live yet/i)
    })
  })
})
