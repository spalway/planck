/**
 * The PLANCKBITS app, separated from the process that runs it.
 *
 * Every dependency that touches the network, the database or the clock is
 * injected. That is not ceremony: the hire route shipped with two undefined
 * identifiers in it and failed on every request, and nothing caught it
 * because the routes could not be exercised without a live Birdeye key and a
 * live database. They can now.
 *
 * server/index.mjs supplies the real implementations and listens.
 */

import express from "express"
import { existsSync } from "node:fs"

/** Base58, and Solana addresses are 32-44 chars. Rejects junk before Birdeye sees it. */
export const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

/** How many brokers one wallet may mint. Keeps one holder from taking the floor. */
export const MINT_CAP_PER_WALLET = 5

/** Concurrent engagements one wallet may hold, so nobody corners the floor. */
export const HIRE_CAP_PER_WALLET = 3

/** One engagement runs for an epoch. */
export const TERM_DAYS = 7

/** Name collisions are possible; the database rejects them and we re-roll. */
const MINT_ATTEMPTS = 5

export function createApp({ config = {}, deps, dist = null }) {
  const { birdeyeKey = "", planckMint = "" } = config

  const {
    tokenStats,
    walletHolding,
    rollBroker,
    insertRow,
    countBrokersOwnedBy,
    openEngagementsFor,
    supabaseConfigured,
    newId,
    now = () => Date.now(),
    uniqueViolation,
    foreignKeyViolation,
  } = deps

  const app = express()
  app.disable("x-powered-by")

  /**
   * Guards every token route.
   *
   * 503 rather than 500: the service is fine, it just has not been given a key
   * or a mint yet, and the frontend renders that as "not live" rather than an
   * error.
   */
  function requireConfig(res) {
    if (!birdeyeKey) {
      res.status(503).json({ error: "birdeye_not_configured" })
      return false
    }
    if (!planckMint) {
      res.status(503).json({ error: "token_not_launched" })
      return false
    }
    return true
  }

  /** Both write routes need a key, a mint and a database. */
  function requireWritable(res) {
    if (!requireConfig(res)) return false
    if (!supabaseConfigured()) {
      res.status(503).json({ error: "database_not_configured" })
      return false
    }
    return true
  }

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      // Booleans only. Never report the values themselves.
      birdeye: Boolean(birdeyeKey),
      token: Boolean(planckMint),
      database: supabaseConfigured(),
      build: dist ? existsSync(dist + "/index.html") : false,
    })
  })

  app.get("/api/token", async (_req, res) => {
    if (!requireConfig(res)) return

    try {
      res.json(await tokenStats(planckMint, birdeyeKey))
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
      res.json(await walletHolding(wallet, planckMint, birdeyeKey))
    } catch (e) {
      console.warn("[PLANCKBITS] holding lookup failed:", e.message)
      res.status(502).json({ error: "upstream_failed" })
    }
  })

  app.post("/api/mint", express.json({ limit: "1kb" }), async (req, res) => {
    if (!requireWritable(res)) return

    const wallet = String(req.body?.wallet ?? "")
    if (!BASE58.test(wallet)) {
      return res.status(400).json({ error: "invalid_wallet" })
    }

    try {
      // The gate. Checked here rather than trusting anything the client said,
      // because the client can say whatever it likes.
      const holding = await walletHolding(wallet, planckMint, birdeyeKey)
      if (!holding.holds) {
        return res.status(403).json({ error: "not_holding" })
      }

      if ((await countBrokersOwnedBy(wallet)) >= MINT_CAP_PER_WALLET) {
        return res
          .status(409)
          .json({ error: "mint_cap_reached", cap: MINT_CAP_PER_WALLET })
      }

      for (let attempt = 0; attempt < MINT_ATTEMPTS; attempt++) {
        const broker = rollBroker()
        try {
          const row = await insertRow("brokers", {
            id: newId(),
            owner_wallet: wallet,
            tenure_hours: 0,
            ...broker,
          })
          return res.status(201).json(row)
        } catch (e) {
          // A duplicate name is expected occasionally — re-roll rather than fail.
          if (e.code === uniqueViolation) continue
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

  app.post("/api/hire", express.json({ limit: "1kb" }), async (req, res) => {
    if (!requireWritable(res)) return

    const wallet = String(req.body?.wallet ?? "")
    const brokerId = String(req.body?.brokerId ?? "")

    if (!BASE58.test(wallet)) return res.status(400).json({ error: "invalid_wallet" })
    if (!/^PB-[A-Z0-9-]{1,32}$/.test(brokerId)) {
      return res.status(400).json({ error: "invalid_broker" })
    }

    try {
      // Re-checked here, never trusted from the client.
      const holding = await walletHolding(wallet, planckMint, birdeyeKey)
      if (!holding.holds) return res.status(403).json({ error: "not_holding" })

      if ((await openEngagementsFor(wallet)) >= HIRE_CAP_PER_WALLET) {
        return res
          .status(409)
          .json({ error: "hire_cap_reached", cap: HIRE_CAP_PER_WALLET })
      }

      const termEnd = new Date(now() + TERM_DAYS * 86_400_000).toISOString()

      const row = await insertRow("engagements", {
        broker_id: brokerId,
        hirer_wallet: wallet,
        term_end: termEnd,
      })

      return res.status(201).json(row)
    } catch (e) {
      // The partial unique index rejects a second open engagement on one broker.
      // That is a race two clients can genuinely hit, not a bug — say so.
      if (e.code === uniqueViolation) {
        return res.status(409).json({ error: "already_engaged" })
      }
      // A missing broker violates the foreign key.
      if (e.code === foreignKeyViolation) {
        return res.status(404).json({ error: "no_such_broker" })
      }

      console.warn("[PLANCKBITS] hire failed:", e.message)
      res.status(502).json({ error: "hire_failed" })
    }
  })

  // An unmatched /api/* must 404 as JSON. Falling through to the SPA would hand
  // a fetch() an HTML page and produce a confusing JSON parse error.
  app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }))

  if (dist) {
    app.use(
      express.static(dist, {
        setHeaders(res, path) {
          // Hashed bundles are immutable; index.html must never be cached or a
          // deploy will not reach anyone still holding the old one.
          //
          // Normalise separators first: express.static hands back native paths,
          // so a check for "/static/" silently never matched on Windows and
          // every asset shipped uncached.
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
      res.sendFile(dist + "/index.html")
    })
  }

  return app
}
