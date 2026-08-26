# PLANCKBITS — path to a live site

Status as of 2026-08-23. Architecture: **off-chain v1 on Supabase, Anchor
program later.** Host: Railway. Vault holdings stay genuinely on-chain and
auditable; broker bookkeeping is Postgres.

---

## A. Blocked on you

These are inputs I cannot create. Everything else is designed to degrade
gracefully until they exist.

| # | Input | Needed for | Notes |
|---|---|---|---|
| A1 | **Supabase project URL + anon key** | roster, engagements, price history | Free tier is fine. The anon key is public by design; RLS is the protection. |
| A2 | **Vault treasury wallet address** | real holdings on `/holdings` | Just a Solana address. Biggest credibility win available, and needs nothing else. |
| A3 | **$PLANCK contract address** | funding line, hire payments | Pending the tokens.xyz launch. |
| A4 | **Fee split numbers** | hire flow, step 04 copy | 60/30/10 owner/vault/burn is my placeholder, not a decision. |
| A5 | **RPC endpoint** | holdings, payment verification | Public mainnet RPC rate-limits and blocks browsers. Helius free tier is enough. |
| A6 | **Railway account + domain** | deployment | Repo is already configured for it. |

---

## B. Done

- Site, 5 pages + 404, live Jupiter prices for 13 verified RWA mints
- 24 generative pixel brokers, trait-composed
- Wallet connect (Wallet Standard — Phantom, Solflare, Backpack)
- Railway build/start config, SPA deep links verified against a real build
- 146 tests, typecheck and production build clean

## B2. Done this pass, no inputs required

- **Error boundary** — one bad render no longer white-screens the site
- **Favicon + OG/Twitter meta** — a shared link now previews instead of looking dead
- **`robots.txt`**
- **Supabase schema** — full SQL migration with RLS, ready to run against A1
- **Data-source layer** — roster reads through one module; swapping fixture for
  Supabase is a single file, not a refactor
- **Treasury holdings reader** — raw JSON-RPC, env-gated; renders real balances
  the moment A2 and A5 exist, and says "not deployed" until then
- **README + deploy runbook**
- **Spec reconciled** to off-chain v1

---

## C. Blocked on A, then straightforward

| # | Work | Unblocked by |
|---|---|---|
| C1 | Roster served from Supabase instead of the fixture | A1 |
| C2 | Real vault holdings with cost basis and P&L | A2 + A5 |
| C3 | Price snapshot cron → track-record charts over time | A1 |
| C4 | Hire flow: pay $PLANCK, verify the transfer, write the engagement | A1 + A3 + A4 + A5 |
| C5 | Mint flow: roll traits, persist, assign a desk | A1 |
| C6 | "My brokers" — owned brokers for the connected wallet | A1 |
| C7 | Supabase auth / wallet sign-in | A1 (you said later) |

**Critical path to a site that does something: A1 → C1 → C5 → C4.**
**Critical path to a site that is believable: A2 + A5 → C2.** That one is
independent and much cheaper — a treasury address and an RPC key turn
`/holdings` from a promise into a verifiable page.

---

## D. Pre-launch checklist

- [ ] Point a custom domain at Railway, force HTTPS
- [ ] Set env vars in Railway (never commit `.env`)
- [ ] Confirm `/brokers` and other deep links resolve on the deployed host
- [ ] Re-read the disclaimer against what the site actually does at launch
- [ ] Confirm the funding line shows the real CA and still has no price or chart
- [ ] Check the OG preview renders in a real post before announcing
- [ ] Verify holdings against an explorer — the numbers must match

## E. After launch

- Anchor program takes over the broker layer; Supabase becomes an indexer
- Broker secondary market
- Public API over vault holdings

---

## The honesty line

The site claims its numbers are derived, not authored. With Supabase holding
the broker records that is true of prices and vault holdings, and **not** true
of engagements and track records — those are rows the firm writes.

Keep the copy matched to that. "Arithmetic on public data" is fair for
holdings and P&L. It is not fair for a hire count. When the Anchor program
lands the claim becomes true everywhere; until then, do not overstate it.
