import { describe, expect, it, vi } from "vitest"

import {
  HIRE_CAP_PER_WALLET,
  MINT_CAP_PER_WALLET,
  TERM_DAYS,
  createApp,
} from "./app.mjs"

/**
 * The API, exercised without a Birdeye key or a database.
 *
 * These exist because /api/hire shipped calling two identifiers that were
 * never imported. Every request failed, and no test could have caught it:
 * the routes were welded to live credentials. They are injected now.
 */

const WALLET = "7pt9tkctJPK7PPNQJ77GKg8ZffSF6QxoMiCFYHxrtaCj"
const MINT = "So11111111111111111111111111111111111111112"
const SECRET = "bd_live_seCretKey_9f3a"
const UNIQUE = "23505"
const FK = "23503"

/** Minimal in-process request. Avoids pulling supertest in for six routes. */
async function call(app, method, path, body) {
  const { createServer } = await import("node:http")
  const server = createServer(app)
  await new Promise((r) => server.listen(0, "127.0.0.1", r))
  const { port } = server.address()

  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    return { status: res.status, body: await res.json().catch(() => null) }
  } finally {
    await new Promise((r) => server.close(r))
  }
}

function build(overrides = {}) {
  const deps = {
    tokenStats: vi.fn(async () => ({ mint: MINT, holders: 3, supply: 1, symbol: "P" })),
    walletHolding: vi.fn(async () => ({
      wallet: WALLET,
      mint: MINT,
      holds: true,
      amount: 100,
    })),
    rollBroker: vi.fn(() => ({
      name: "MILO STRAND",
      desk: "equities",
      nerve: 50,
      latency: 50,
      coverage: 3,
      effective_nerve: 50,
    })),
    insertRow: vi.fn(async (_table, row) => ({ ...row })),
    countBrokersOwnedBy: vi.fn(async () => 0),
    openEngagementsFor: vi.fn(async () => 0),
    supabaseConfigured: vi.fn(() => true),
    newId: () => "PB-TEST0001",
    now: () => 1_700_000_000_000,
    uniqueViolation: UNIQUE,
    foreignKeyViolation: FK,
    ...overrides,
  }

  const config = { birdeyeKey: SECRET, planckMint: MINT, ...(overrides.config ?? {}) }
  return { app: createApp({ config, deps }), deps }
}

describe("health", () => {
  it("reports each capability as a boolean and never its value", async () => {
    const { app } = build()
    const res = await call(app, "GET", "/api/health")

    expect(res.body).toMatchObject({ ok: true, birdeye: true, token: true, database: true })
    // The mint and the key must not appear anywhere in the payload. A health
    // endpoint that leaks the secret it is reporting on is worse than none.
    expect(JSON.stringify(res.body)).not.toContain(MINT)
    expect(JSON.stringify(res.body)).not.toContain(SECRET)
  })

  it("still answers when nothing is configured", async () => {
    const { app } = build({
      config: { birdeyeKey: "", planckMint: "" },
      supabaseConfigured: () => false,
    })
    const res = await call(app, "GET", "/api/health")
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ birdeye: false, token: false, database: false })
  })
})

describe("configuration gates", () => {
  it("says the token has not launched rather than erroring", async () => {
    const { app } = build({ config: { birdeyeKey: SECRET, planckMint: "" } })
    const res = await call(app, "GET", "/api/token")
    expect(res.status).toBe(503)
    expect(res.body.error).toBe("token_not_launched")
  })

  it("distinguishes a missing Birdeye key from a missing mint", async () => {
    const { app } = build({ config: { birdeyeKey: "", planckMint: MINT } })
    const res = await call(app, "GET", "/api/token")
    expect(res.body.error).toBe("birdeye_not_configured")
  })

  it("refuses writes without a database", async () => {
    const { app } = build({ supabaseConfigured: () => false })
    const res = await call(app, "POST", "/api/mint", { wallet: WALLET })
    expect(res.status).toBe(503)
    expect(res.body.error).toBe("database_not_configured")
  })
})

describe("/api/holding", () => {
  it("rejects a wallet that is not base58 before calling upstream", async () => {
    const { app, deps } = build()
    const res = await call(app, "GET", "/api/holding?wallet=not-a-wallet")

    expect(res.status).toBe(400)
    expect(deps.walletHolding).not.toHaveBeenCalled()
  })

  it("returns the holding for a valid wallet", async () => {
    const { app } = build()
    const res = await call(app, "GET", `/api/holding?wallet=${WALLET}`)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ holds: true, amount: 100 })
  })
})

describe("/api/mint", () => {
  it("refuses a wallet that holds nothing", async () => {
    const { app } = build({
      walletHolding: async () => ({ wallet: WALLET, mint: MINT, holds: false, amount: 0 }),
    })
    const res = await call(app, "POST", "/api/mint", { wallet: WALLET })
    expect(res.status).toBe(403)
    expect(res.body.error).toBe("not_holding")
  })

  it("checks holding server-side even when the client claims otherwise", async () => {
    const { app, deps } = build()
    await call(app, "POST", "/api/mint", { wallet: WALLET, holds: true, nerve: 100 })

    expect(deps.walletHolding).toHaveBeenCalled()
    // Traits come from the server roll, never from the request body.
    const [, row] = deps.insertRow.mock.calls[0]
    expect(row.nerve).toBe(50)
    expect(row.owner_wallet).toBe(WALLET)
  })

  it("enforces the per-wallet cap", async () => {
    const { app } = build({ countBrokersOwnedBy: async () => MINT_CAP_PER_WALLET })
    const res = await call(app, "POST", "/api/mint", { wallet: WALLET })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ error: "mint_cap_reached", cap: MINT_CAP_PER_WALLET })
  })

  it("re-rolls past a duplicate name rather than failing the mint", async () => {
    let calls = 0
    const insertRow = vi.fn(async (_t, row) => {
      calls += 1
      if (calls === 1) throw Object.assign(new Error("dupe"), { code: UNIQUE })
      return { ...row }
    })

    const { app } = build({ insertRow })
    const res = await call(app, "POST", "/api/mint", { wallet: WALLET })

    expect(res.status).toBe(201)
    expect(insertRow).toHaveBeenCalledTimes(2)
  })
})

describe("/api/hire", () => {
  it("creates an engagement with a forward term", async () => {
    const { app, deps } = build()
    const res = await call(app, "POST", "/api/hire", {
      wallet: WALLET,
      brokerId: "PB-001",
    })

    expect(res.status).toBe(201)

    const [table, row] = deps.insertRow.mock.calls[0]
    expect(table).toBe("engagements")
    expect(row.broker_id).toBe("PB-001")
    expect(row.hirer_wallet).toBe(WALLET)
    expect(new Date(row.term_end).getTime()).toBe(
      1_700_000_000_000 + TERM_DAYS * 86_400_000
    )
    // Hiring is gated on holding, not on a fee. Nothing may be charged.
    expect(row.fee_planck).toBeUndefined()
  })

  it("rejects a malformed broker id before touching the database", async () => {
    const { app, deps } = build()
    const res = await call(app, "POST", "/api/hire", {
      wallet: WALLET,
      brokerId: "'; drop table brokers; --",
    })

    expect(res.status).toBe(400)
    expect(deps.insertRow).not.toHaveBeenCalled()
  })

  it("refuses a wallet that holds nothing", async () => {
    const { app } = build({
      walletHolding: async () => ({ wallet: WALLET, mint: MINT, holds: false, amount: 0 }),
    })
    const res = await call(app, "POST", "/api/hire", { wallet: WALLET, brokerId: "PB-001" })
    expect(res.status).toBe(403)
  })

  it("enforces the concurrent-engagement cap", async () => {
    const { app } = build({ openEngagementsFor: async () => HIRE_CAP_PER_WALLET })
    const res = await call(app, "POST", "/api/hire", { wallet: WALLET, brokerId: "PB-001" })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ error: "hire_cap_reached", cap: HIRE_CAP_PER_WALLET })
  })

  it("reports a broker already engaged rather than a server error", async () => {
    const { app } = build({
      insertRow: async () => {
        throw Object.assign(new Error("dupe"), { code: UNIQUE })
      },
    })
    const res = await call(app, "POST", "/api/hire", { wallet: WALLET, brokerId: "PB-001" })

    expect(res.status).toBe(409)
    expect(res.body.error).toBe("already_engaged")
  })

  it("404s a broker that does not exist", async () => {
    const { app } = build({
      insertRow: async () => {
        throw Object.assign(new Error("fk"), { code: FK })
      },
    })
    const res = await call(app, "POST", "/api/hire", { wallet: WALLET, brokerId: "PB-404" })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe("no_such_broker")
  })
})

describe("unmatched api routes", () => {
  it("404 as JSON rather than falling through to the SPA", async () => {
    const { app } = build()
    const res = await call(app, "GET", "/api/nope")

    expect(res.status).toBe(404)
    // An HTML body here would give fetch() a confusing JSON parse error.
    expect(res.body).toEqual({ error: "not_found" })
  })
})

describe("missing static assets", () => {
  // The static branch only exists when the app is given a dist, so these
  // build one rather than depending on a prior 'npm run build'.
  async function withDist() {
    const { mkdtempSync, writeFileSync } = await import("node:fs")
    const { tmpdir } = await import("node:os")
    const { join } = await import("node:path")

    const dir = mkdtempSync(join(tmpdir(), "planckbits-"))
    writeFileSync(join(dir, "index.html"), "<!doctype html><div id=root></div>")

    const { deps } = build()
    return createApp({ config: { birdeyeKey: SECRET, planckMint: MINT }, deps, dist: dir })
  }

  it("404s a missing file instead of serving the SPA under a 200", async () => {
    // A deleted font kept returning index.html with a 200, so the browser
    // parsed an HTML page as a font and reported a decode error that pointed
    // at the asset rather than at the missing file.
    const res = await call(await withDist(), "GET", "/fonts/gone.woff2")
    expect(res.status).toBe(404)
  })

  it("still serves the SPA for a real page route", async () => {
    const res = await call(await withDist(), "GET", "/how-it-works")
    expect(res.status).toBe(200)
  })
})

describe("the mint is runtime config, not boot config", () => {
  /** Lets a test change the answer mid-flight, as an UPDATE would. */
  function withMutableMint(initial) {
    const box = { mint: initial }
    const { deps } = build()
    const app = createApp({
      config: { birdeyeKey: SECRET },
      deps: { ...deps, resolveMint: async () => box.mint },
    })
    return { app, box }
  }

  it("serves the address over /api/config", async () => {
    const { app } = withMutableMint(MINT)
    const res = await call(app, "GET", "/api/config")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ mint: MINT })
  })

  it("reports null before launch rather than an empty string", async () => {
    const { app } = withMutableMint("")
    const res = await call(app, "GET", "/api/config")
    expect(res.body).toEqual({ mint: null })
  })

  it("never lets a proxy cache the contract address", async () => {
    // A stale address is worse than none — someone would send funds to it.
    const { createServer } = await import("node:http")
    const { app } = withMutableMint(MINT)
    const server = createServer(app)
    await new Promise((r) => server.listen(0, "127.0.0.1", r))
    try {
      const res = await fetch(`http://127.0.0.1:${server.address().port}/api/config`)
      expect(res.headers.get("cache-control")).toBe("no-store")
    } finally {
      await new Promise((r) => server.close(r))
    }
  })

  it("goes live mid-flight, with no restart", async () => {
    // The whole point of moving the mint into Postgres: one UPDATE and the
    // running server starts answering, instead of 503ing from a value it
    // captured at boot until someone redeploys.
    const { app, box } = withMutableMint("")

    expect((await call(app, "GET", "/api/token")).body.error).toBe("token_not_launched")
    expect((await call(app, "GET", "/api/health")).body.token).toBe(false)

    box.mint = MINT

    expect((await call(app, "GET", "/api/token")).status).toBe(200)
    expect((await call(app, "GET", "/api/health")).body.token).toBe(true)
    expect((await call(app, "GET", "/api/config")).body.mint).toBe(MINT)
  })

  it("passes the freshly resolved mint to Birdeye, not a stale one", async () => {
    const { deps } = build()
    const box = { mint: MINT }
    const app = createApp({
      config: { birdeyeKey: SECRET },
      deps: { ...deps, resolveMint: async () => box.mint },
    })

    await call(app, "GET", `/api/holding?wallet=${WALLET}`)
    expect(deps.walletHolding).toHaveBeenCalledWith(WALLET, MINT, SECRET)
  })
})
