# PLANCKBITS

A labor market for AI broker agents holding real-world assets on Solana.

Mint a broker, and he takes a desk. Someone pays $PLANCK to hire him, and the
firm's vault buys the real asset behind that desk — and never sells it.

- **Spec:** [`docs/superpowers/specs/2026-08-23-planckbits-design.md`](docs/superpowers/specs/2026-08-23-planckbits-design.md)
- **Road to launch:** [`LAUNCH.md`](LAUNCH.md)

---

## Running it

```bash
npm install
npm run dev      # http://localhost:5190
```

For the API routes, run the server alongside it in a second terminal — Vite
proxies `/api` to port 3000:

```bash
npm run build && npm start
```

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm start` | Express server: serves `dist/` and `/api`. What Railway runs |
| `npm test` | full suite (vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | production build to `dist/` |
| `npm run og` | regenerate `public/og.png` |
| `npm run standalone` | one self-contained HTML file for sharing a preview |

No environment variables are required. Without them the site runs on local
fixtures and live Jupiter prices, and every token route reports "not launched".

## Environment

Copy `.env.example` to `.env`.

**Only `VITE_` vars are public** — they are baked into the browser bundle where
anyone can read them. Everything else is server-side. Never give a secret a
`VITE_` prefix.

| Var | Side | Effect when set |
|---|---|---|
| `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` | client | roster reads from Postgres |
| `SUPABASE_SERVICE_ROLE_KEY` | server | minting can write rows |
| `BIRDEYE_API_KEY` | server | holder counts and the mint gate |
| `VITE_PLANCK_MINT` | both | the token everything is gated on |

On Solana the contract address people paste around *is* the mint address, so
`VITE_PLANCK_MINT` is one variable read by both the browser bundle and the
server. It is public — the site prints it on purpose — which is why it may
carry the `VITE_` prefix.

`SOLANA_RPC` and `VAULT_ADDRESS` appear in `.env.example` but no code reads
them yet. They are Phase 2 and setting them today does nothing.

## API

Served by `server/index.mjs`. All same-origin; Vite proxies `/api` to it in dev.

| Route | Does |
|---|---|
| `GET /api/health` | booleans for what is configured — never the values |
| `GET /api/token` | holder count and supply. **No price** — the field is dropped, not forwarded |
| `GET /api/holding?wallet=` | whether a wallet holds $PLANCK |
| `POST /api/mint` | re-checks the holding, rolls traits server-side, writes the row |

Unconfigured routes answer `503` with a reason rather than failing, and the UI
renders that as a state rather than an error.

## Deploying to Railway

1. New project → deploy from this repo.
2. Railway reads `railway.json`: build `npm run build`, start `npm start`,
   health check `/api/health`.
3. Add env vars under **Variables**. Redeploy after changing any `VITE_` one —
   those are baked in at build time, not read at runtime.
4. Attach a domain and force HTTPS.
5. Load a deep link such as `/brokers` directly. A 404 there means the SPA
   fallback is not working.

## Architecture

```
server/            holds every secret; the browser never sees one
  index.mjs          static + /api, SPA fallback
  birdeye.mjs        holder data. Price fields deliberately dropped
  brokers.mjs        trait rolling — server-side so it cannot be forged
  supabase.mjs       writes under the service role
src/lib/           pure data + logic, no React
  instruments.ts     13 hardcoded RWA mints, 5 desks
  jupiter-price.ts   live prices by mint
  records.ts         P&L — null-safe, never fabricates a zero
  brokers.ts         trait rolls, coverage-overflow rule, fixture roster
  roster-source.ts   the one seam between the app and its broker data
  solana-wallets.ts  Wallet Standard connect
src/hooks/         React bindings over the above
src/components/    presentational, data via props
src/pages/         one per route
supabase/          SQL migrations
```

Four rules the tests enforce:

1. **Instruments resolve by hardcoded mint, never by ticker.** Every symbol on
   the board has scam duplicates on Solana — `SPYX` at $0, `METAx` cloned on
   pump.fun, and an `OUSG` impersonating a J.P. Morgan fund.
2. **An absent number renders as an em dash, never `$0`.** A fabricated zero is
   indistinguishable from a real collapse.
3. **A partially-priced desk reports no total.** Summing only the priced legs
   understates it, which reads as a crash.
4. **Server and client agree on desk sizes and effective nerve.** They are
   necessarily duplicated; drift would corrupt the coverage-overflow rule for
   every broker minted afterwards.

## What is real today

| | Source | Verifiable by anyone? |
|---|---|---|
| Instrument prices | Jupiter Price v3 | yes |
| Vault holdings | Solana RPC (pending an address) | yes |
| Holder status | Birdeye | yes |
| Broker roster, engagements | fixture now, Supabase next | no |

The site's claim is that its numbers are derived rather than authored. That is
true of prices, holdings and holder status. It is **not** true of broker records
while they live in Postgres — keep the copy honest about the difference until
the Anchor program lands.
