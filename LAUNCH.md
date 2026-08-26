# PLANCKBITS — path to a live site

Architecture: **off-chain v1.** Express server on Railway, Postgres on Supabase,
Birdeye for holder data, Jupiter for prices. No Anchor program.

Vault holdings stay verifiable against Solana; broker bookkeeping is Postgres.

---

## A. Blocked on you

Inputs I cannot create. Everything degrades gracefully until they exist — the
site runs today with none of them set.

| # | Input | Env var | Unblocks |
|---|---|---|---|
| A1 | Supabase project | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | roster from Postgres, minting |
| A2 | Birdeye API key | `BIRDEYE_API_KEY` | holder counts, the mint gate |
| A3 | $PLANCK mint address | `PLANCK_MINT` | everything token-gated |
| A4 | Vault treasury address | `VAULT_ADDRESS` | real holdings |
| A5 | Solana RPC (Helius) | `SOLANA_RPC` | holdings, payment verification |
| A6 | Railway project + domain | — | deployment |

**Only `VITE_`-prefixed vars are public.** Everything else is server-side and
must never gain that prefix — it would publish the secret in the browser bundle.

### Setting up Supabase (A1)

1. Create a project.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor.
3. Copy the project URL and **anon** key into `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY`.
4. Copy the **service role** key into `SUPABASE_SERVICE_ROLE_KEY`. Server only.

The schema grants public `select` and defines no write policy at all, so the
anon key cannot write. Every insert goes through the server under the service
role. A client able to insert its own engagement could grant itself a track
record.

---

## B. Done

- Five pages plus mint and a 404; landing page leads with the roster
- 24 generative pixel brokers, 16×16, trait-composed, distinct per broker
- Live Jupiter prices for 13 verified RWA mints
- Wallet connect over the Wallet Standard
- Express server: Birdeye proxy, holder gate, mint endpoint, health check
- Supabase schema with RLS; data seam so the roster switches source with no
  component change
- Error boundary, favicon, OG card, robots.txt, SPA deep links
- 192 tests, typecheck and production build clean

---

## C. Blocked on A, then straightforward

| # | Work | Needs |
|---|---|---|
| C1 | Roster served from Postgres instead of the fixture | A1 |
| C2 | Real vault holdings with cost basis and P&L | A4 + A5 |
| C3 | Price snapshot cron → track records over time | A1 |
| C4 | Hire flow: pay $PLANCK, verify the transfer by signature, write the engagement | A1 + A3 + A5 |
| C5 | "My brokers" for the connected wallet | A1 |
| C6 | Holder count surfaced on the floor | A2 + A3 |

**Cheapest credibility win: A4 + A5.** A treasury address and an RPC key turn
`/holdings` from a promise into a page anyone can check against an explorer.

---

## D. Pre-launch checklist

- [ ] Run the migration; confirm RLS is on for all four tables
- [ ] Set every env var in Railway → **Variables**
- [ ] Redeploy after setting them — `VITE_` vars are baked in at build time
- [ ] Confirm `/api/health` reports `birdeye: true`, `token: true`
- [ ] Load `/brokers` directly; a 404 means the SPA fallback broke
- [ ] Mint once on a holder wallet, once on a non-holder — the second must be refused
- [ ] Confirm the funding line shows the real CA and still has no price or chart
- [ ] Check the OG card renders in a real post before announcing
- [ ] Verify holdings against an explorer — the numbers must match
- [ ] Re-read the disclaimer against what the site actually does at launch

---

## E. After launch

- Anchor program takes over minting and hiring; Supabase becomes an indexer
- Broker secondary market
- Public API over vault holdings

---

## The honesty line

The site claims its numbers are derived, not authored. Under this architecture
that is **true** of instrument prices and vault holdings — anyone can check them
against Jupiter and an explorer — and **false** of engagements and track
records, which are rows the firm writes.

Keep the copy matched to that. "Arithmetic on public data" is fair for holdings
and P&L. It is not fair for a hire count. The Anchor program is what makes the
claim true everywhere; until then, do not overstate it.
