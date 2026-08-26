/**
 * The PLANCKBITS server.
 *
 * Serves the built site and the handful of endpoints that cannot run in a
 * browser because they hold secrets:
 *
 *   - Birdeye needs an API key.
 *   - Supabase writes need the service role key; the anon key is read-only by
 *     design, and a client that could insert its own engagement could grant
 *     itself a track record.
 *
 * Static hosting alone (serve -s) cannot do either, which is why this replaced
 * it. See LAUNCH.md.
 */

import express from "express"
import { existsSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"

import { tokenStats, walletHolding } from "./birdeye.mjs"
import { rollBroker } from "./brokers.mjs"
import { UNIQUE_VIOLATION, countBrokersOwnedBy, insertRow, supabaseConfigured } from "./supabase.mjs"

const root = fileURLToPath(new URL("..", import.meta.url))
const dist = `${root}dist`

const PORT = Number(process.env.PORT) || 3000
const BIRDEYE_KEY = process.env.BIRDEYE_API_KEY ?? ""
const PLANCK_MINT = process.env.PLANCK_MINT ?? ""

const app = express()
app.disable("x-powered-by")

/** Base58, and Solana addresses are 32-44 chars. Rejects junk before Birdeye sees it. */
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

/**
 * Guards every token route.
 *
 * 503 rather than 500: the service is fine, it just has not been given a key
 * or a mint yet, and the frontend renders that as "not live" rather than an
 * error.
 */
function requireConfig(res) {
  if (!BIRDEYE_KEY) {
    res.status(503).json({ error: "birdeye_not_configured" })
    return false
  }
  if (!PLANCK_MINT) {
    res.status(503).json({ error: "token_not_launched" })
    return false
  }
  return true
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    // Booleans only. Never report the values themselves.
    birdeye: Boolean(BIRDEYE_KEY),
    token: Boolean(PLANCK_MINT),
    build: existsSync(`${dist}/index.html`),
  })
})

app.get("/api/token", async (_req, res) => {
  if (!requireConfig(res)) return

  try {
    res.json(await tokenStats(PLANCK_MINT, BIRDEYE_KEY))
  } catch (e) {
    console.warn("[PLANCKBITS] token stats failed:", e.message)
    res.status(502).json({ error: "upstream_failed" })
  }
})

app.get("/api/holding", async (req, res) => {
  if (!requireConfig(res)) return

  const wallet = String(req.query.wallet ?? "")
  if (!BASE58.test(wallet)) {
    return res.status(400).json({ error: "invalid_wallet" })
  }

  try {
    res.json(await walletHolding(wallet, PLANCK_MINT, BIRDEYE_KEY))
  } catch (e) {
    console.warn("[PLANCKBITS] holding lookup failed:", e.message)
    res.status(502).json({ error: "upstream_failed" })
  }
})

/** How many brokers one wallet may mint. Keeps one holder from taking the floor. */
const MINT_CAP_PER_WALLET = 5

/** Name collisions are possible; the database rejects them and we re-roll. */
const MINT_ATTEMPTS = 5

app.post("/api/mint", express.json({ limit: "1kb" }), async (req, res) => {
  if (!requireConfig(res)) return

  if (!supabaseConfigured()) {
    return res.status(503).json({ error: "database_not_configured" })
  }

  const wallet = String(req.body?.wallet ?? "")
  if (!BASE58.test(wallet)) {
    return res.status(400).json({ error: "invalid_wallet" })
  }

  try {
    // The gate. Checked here rather than trusting anything the client said,
    // because the client can say whatever it likes.
    const holding = await walletHolding(wallet, PLANCK_MINT, BIRDEYE_KEY)
    if (!holding.holds) {
      return res.status(403).json({ error: "not_holding" })
    }

    if ((await countBrokersOwnedBy(wallet)) >= MINT_CAP_PER_WALLET) {
      return res.status(409).json({ error: "mint_cap_reached", cap: MINT_CAP_PER_WALLET })
    }

    for (let attempt = 0; attempt < MINT_ATTEMPTS; attempt++) {
      const broker = rollBroker()
      try {
        const row = await insertRow("brokers", {
          id: `PB-${randomUUID().slice(0, 8).toUpperCase()}`,
          owner_wallet: wallet,
          tenure_hours: 0,
          ...broker,
        })
        return res.status(201).json(row)
      } catch (e) {
        // A duplicate name is expected occasionally — re-roll rather than fail.
        if (e.code === UNIQUE_VIOLATION) continue
        throw e
      }
    }

    console.warn("[PLANCKBITS] mint exhausted attempts — name pool may be full")
    res.status(503).json({ error: "name_pool_exhausted" })
  } catch (e) {
    console.warn("[PLANCKBITS] mint failed:", e.message)
    res.status(502).json({ error: "mint_failed" })
  }
})

// An unmatched /api/* must 404 as JSON. Falling through to the SPA would hand
// a fetch() an HTML page and produce a confusing JSON parse error.
app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }))

app.use(
  express.static(dist, {
    setHeaders(res, path) {
      // Hashed bundles are immutable; index.html must never be cached or a
      // deploy will not reach anyone still holding the old one.
      //
      // Normalise separators first: express.static hands back native paths, so
      // a check for "/static/" silently never matched on Windows and every
      // asset shipped uncached.
      const p = path.split("\\").join("/")
      if (p.endsWith("index.html")) res.setHeader("Cache-Control", "no-cache")
      else if (p.includes("/static/")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
      }
    },
  })
)

/** SPA fallback: client-side routes are not files on disk. */
app.get(/.*/, (_req, res) => {
  res.sendFile(`${dist}/index.html`)
})

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[PLANCKBITS] listening on ${PORT}`)
  if (!BIRDEYE_KEY) console.warn("[PLANCKBITS] BIRDEYE_API_KEY unset — token routes return 503")
  if (!PLANCK_MINT) console.warn("[PLANCKBITS] PLANCK_MINT unset — token routes return 503")
})
