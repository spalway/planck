/**
 * The APEBITS server process.
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
 *
 * The routes themselves live in server/app.mjs so they can be tested without
 * a live key or a live database.
 */

import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"

import { createApp } from "./app.mjs"
import { tokenStats, walletHolding } from "./birdeye.mjs"
import { rollBroker } from "./brokers.mjs"
import { configValue } from "./site-config.mjs"
import {
  FOREIGN_KEY_VIOLATION,
  UNIQUE_VIOLATION,
  countBrokersOwnedBy,
  insertRow,
  openEngagementsFor,
  supabaseConfigured,
} from "./supabase.mjs"

const root = fileURLToPath(new URL("..", import.meta.url))
const dist = `${root}dist`

const PORT = Number(process.env.PORT) || 3000
const BIRDEYE_KEY = process.env.BIRDEYE_API_KEY ?? ""
const XSTOCKS_KEY = process.env.XSTOCKS_API_KEY ?? ""
const XTOKENS_KEY = process.env.XTOKENS_API_KEY ?? ""

/**
 * The environment is the fallback, not the source.
 *
 * public_config.ape_mint is authoritative, so launching the token is an
 * UPDATE rather than a redeploy. The env var still works — it is what local
 * development and any deploy without a database use — but the database wins
 * whenever it has an answer.
 */
const ENV_MINT = process.env.VITE_APE_MINT ?? process.env.APE_MINT ?? ""

const app = createApp({
  config: { birdeyeKey: BIRDEYE_KEY, xstocksKey: XSTOCKS_KEY, xtokensKey: XTOKENS_KEY },
  dist,
  deps: {
    resolveMint: () => configValue("ape_mint", ENV_MINT || null).then((v) => v ?? ""),
    tokenStats,
    walletHolding,
    rollBroker,
    insertRow,
    countBrokersOwnedBy,
    openEngagementsFor,
    supabaseConfigured,
    newId: () => `PB-${randomUUID().slice(0, 8).toUpperCase()}`,
    uniqueViolation: UNIQUE_VIOLATION,
    foreignKeyViolation: FOREIGN_KEY_VIOLATION,
  },
})

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`[APEBITS] listening on ${PORT}`)

  // Say plainly which capability is missing. Each one degrades a specific
  // route to 503 rather than breaking the site, and on a fresh deploy the
  // difference between "unconfigured" and "broken" is the whole diagnosis.
  if (!BIRDEYE_KEY) {
    console.warn("[APEBITS] BIRDEYE_API_KEY unset — token routes return 503")
  }
  if (!supabaseConfigured()) {
    console.warn("[APEBITS] Supabase unset — /api/mint and /api/hire return 503")
  }

  const mint = await configValue("ape_mint", ENV_MINT || null)
  if (mint) {
    console.log("[APEBITS] token is live")
  } else {
    console.warn(
      "[APEBITS] no mint yet — set public_config.ape_mint in Postgres " +
        "(takes effect within seconds, no redeploy)"
    )
  }
})
