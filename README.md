# PLANCKOBITS

A labor market for AI broker agents holding real-world assets on Solana.

Mint a broker, and he takes a desk. Someone pays $PLANCK to hire him, and the
firm's vault buys the real asset behind that desk — and never sells it.

- **Spec:** [`docs/superpowers/specs/2026-08-23-planckobits-design.md`](docs/superpowers/specs/2026-08-23-planckobits-design.md)
- **Road to launch:** [`LAUNCH.md`](LAUNCH.md)

---

## Running it

```bash
npm install
npm run dev      # http://localhost:5190
```

| Script | Does |
|---|---|
| `npm run dev` | dev server |
| `npm test` | full suite (vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | production build to `dist/` |
| `npm start` | serve `dist/` — what Railway runs |
| `npm run og` | regenerate `public/og.png` |

No environment variables are required. Without them the app runs on local
fixtures and live Jupiter prices, which is the current state.

## Environment

Copy `.env.example` to `.env`. Every var is optional; each one switches a
subsystem from fixture to real.

| Var | Effect when set |
|---|---|
| `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` | roster comes from Postgres instead of the fixture |
| `VITE_SOLANA_RPC` | vault holdings read from chain |
| `VITE_VAULT_ADDRESS` | the treasury whose holdings are shown |

The Supabase **anon** key is public by design and ships in the client bundle;
row-level security is what protects the data. A **service-role** key must
never carry a `VITE_` prefix — that would publish it in the browser bundle.

## Deploying to Railway

1. New project → deploy from this repo.
2. Railway reads `railway.json`: build `npm run build`, start `npm start`.
   `serve -s` handles SPA fallback and reads `PORT` from the environment.
3. Add env vars under **Variables**. Redeploy after changing them — they are
   baked into the bundle at build time, not read at runtime.
4. Attach a domain and force HTTPS.
5. Load a deep link such as `/brokers` directly. A 404 there means the SPA
   fallback is not working.

## Architecture

```
src/lib/         pure data + logic, no React
  instruments.ts   13 hardcoded RWA mints, 5 desks
  jupiter-price.ts live prices by mint
  records.ts       P&L — null-safe, never fabricates a zero
  brokers.ts       trait rolls, coverage-overflow rule, fixture roster
  roster-source.ts the one seam between the app and its broker data
  supabase.ts      minimal PostgREST reader
  solana-wallets.ts Wallet Standard connect
src/hooks/       React bindings over the above
src/components/  presentational, data via props
src/pages/       one per route
supabase/        SQL migrations
```

Three rules the tests enforce:

1. **Instruments resolve by hardcoded mint, never by ticker.** Every symbol on
   the board has scam duplicates on Solana — `SPYX` at $0, `METAx` cloned on
   pump.fun, and an `OUSG` impersonating a J.P. Morgan fund.
2. **An absent number renders as an em dash, never `$0`.** A fabricated zero is
   indistinguishable from a real collapse.
3. **A partially-priced desk reports no total.** Summing only the priced legs
   understates it, which reads as a crash.

## What is real today

| | Source | Verifiable by anyone? |
|---|---|---|
| Instrument prices | Jupiter Price v3 | yes |
| Vault holdings | Solana RPC (pending an address) | yes |
| Broker roster, engagements | fixture now, Supabase next | no |

The site's claim is that its numbers are derived rather than authored. That is
true of prices and holdings. It is **not** true of broker records while they
live in Postgres — keep the copy honest about the difference until the Anchor
program lands.
