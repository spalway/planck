# APEBITS — Design Spec

**Date:** 2026-08-23
**Status:** Approved, ready for implementation planning

---

## 1. Summary

APEBITS is a labor market for AI broker agents that hold real-world assets on Solana.

A *apebit* is the firm's unit of account: the atomic slice of RWA exposure — the smallest
bit of a real thing that can be owned. The vault's holdings are denominated in apebits.

**The loop:**

1. A user mints a **broker** — a generative pixel-art AI agent with rolled stats and one assigned desk.
2. Another user pays a **hiring fee** in $APE to engage that broker for a term.
3. The fee splits three ways: **broker owner / house vault / burn**.
4. While engaged, the broker deploys the vault's allocation into his desk's real tokenized RWA,
   stamping an on-chain **cost basis**.
5. The vault holds the asset permanently. It never sells.
6. The broker's **track record** is the resulting performance — live price divided by cost basis.

**Two-audience test:**

- *Trencher:* mint a robot broker, people pay to hire him, you get paid.
- *Technical:* every displayed stat is derived from on-chain state and a live price oracle.
  Nothing is authored. A track record is `jupiter_price / recorded_cost_basis`.

---

## 2. Design principles

1. **No invented numbers.** Every figure on the site traces to on-chain state or a live feed.
   If a number cannot be derived, it is not shown.
2. **The vault never sells.** Acquisitions are permanent. This makes holdings auditable and
   removes any discretionary-trading claim.
3. **Stats do work.** Every rolled broker trait affects a real mechanic. No decorative attributes.
4. **The token stays lowkey.** One funding line and the contract address. No price display,
   no chart, no ticker widget anywhere on the site.
5. **Pixel art is illustration only.** All UI structure uses real 1px borders and SVG.
   Zero box-drawing characters in interface chrome.

---

## 3. The desks

Five desks, thirteen instruments. Every mint below was resolved and price-verified against
Jupiter Price API v3 on 2026-08-23.

### EQUITIES — Backed Finance xStocks

| Symbol | Mint | Ref. price | Market cap |
|---|---|---|---|
| NVDAx | `Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg` | $259.49 | — |
| TSLAx | `XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB` | $366.39 | — |
| AAPLx | `XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp` | $308.86 | $47.6M |
| METAx | `Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu` | $553.47 | $40.2M |
| GOOGLx | `XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN` | $345.87 | $55.6M |
| COINx | `Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu` | $189.67 | $25.8M |
| MSTRx | `XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ` | $122.32 | $53.0M |

### INDEX — broad-market xStocks

| Symbol | Mint | Ref. price | Market cap |
|---|---|---|---|
| SPYx | `XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W` | $767.51 | $73.5M |
| QQQx | `Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ` | $714.76 | $60.5M |

### BULLION — gold

| Symbol | Mint | Ref. price | Market cap |
|---|---|---|---|
| PAXG | `5GgRAEmv8ZxF2PR5hY72Qs5x1bnQ6UK2RbTPoqJ3wSwW` | $4,610.63 | $10.9M |
| GLDx | `Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re` | $424.18 | $49.3M |

### YIELD — tokenized treasuries

| Symbol | Mint | Ref. price | Market cap |
|---|---|---|---|
| USDY | `A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6` | $1.1410 | — |

### CREDIT — private credit

| Symbol | Mint | Ref. price | Market cap |
|---|---|---|---|
| syrupUSDC | `AvZZF1YaZDziPY2RCK4oJrRVrbN3mTD9NL24hPeaZeUj` | $1.1793 | $88.0M |

### Excluded instruments and why

- **Franklin Templeton BENJI** — no Jupiter liquidity on Solana. The `BENJI` symbol on Solana
  resolves to unrelated memecoins ("Taylor Swift's Cat", "Benji the Dancer").
- **Ondo OUSG** — the Solana `OUSG` symbol resolves to a pump.fun impersonation named
  "J.P. Morgan Tokenized Money Fund" with a $2.4k market cap. Not the real instrument.
- **Parcl (real estate)** — Parcl exposure is a perp index, not a spot token with a mint.
  It cannot be acquired and held under a never-sells vault, so it does not fit the model.

### CRITICAL: mint resolution rule

**Never resolve an instrument by ticker symbol at runtime.** Every symbol on the board has
scam duplicates on Solana — `SPYX` at $0, `METAx` cloned on pump.fun, `GLDX`/"Goldex" at $0.

All thirteen mints are hardcoded in a single `src/config/instruments.ts` constant. The Jupiter
call sends mint addresses and the response is keyed by mint. No symbol lookup path exists in
the codebase. Authenticity of xStocks mints can be cross-checked against the Backed deployer
`S7vYFFWH6BjJyEsdrPQpqpYTqLTrPRK6KW3VwsJuRaS`.

---

## 4. Brokers

Brokers are generative Metaplex Core assets. Traits roll at mint and each one drives a mechanic.

| Trait | Range | What it does |
|---|---|---|
| **DESK** | one of 5 | Which instruments the broker may touch. Weighted roll; desk scarcity is a rarity axis. |
| **NERVE** | 1–100 | Position size as a percentage of the vault's per-engagement allocation. |
| **LATENCY** | 1–100 | Slots between hire and deployment. Lower is better. |
| **COVERAGE** | 1–N | How many instruments within the desk he can hold simultaneously. Capped by desk size. |
| **TENURE** | accrues | Hours employed across all engagements. The only stat that grows. |

**COVERAGE on single-instrument desks.** YIELD and CREDIT hold one instrument each, so a
coverage roll above 1 would otherwise be inert for those brokers. On any desk where
`COVERAGE > instrument_count`, the surplus converts to an allocation bonus at mint:
each unused point adds to the broker's effective NERVE, capped at 100. This keeps every roll
meaningful across all five desks and is computed once at mint rather than at hire time.

Pixel portraits are trait-composed: body, desk uniform, headset, terminal, and a rarity frame
derived from the roll. Rarity is emergent from the stat distribution rather than a stored tier.

---

## 5. Hiring

A hirer pays a fee in $APE to engage a broker for one **term** (default: 7 days / one epoch).

**Fee split — default, stored in `Firm` config and tunable without redeploy:**

| Recipient | Share |
|---|---|
| Broker owner | 60% |
| House vault | 30% |
| Burn | 10% |

> **Assumption flagged for review.** These percentages were not specified during design and are
> a reasonable default, not a decision. They live in `Firm` config precisely so they can be
> retuned before launch.

**Engagement lifecycle:**

1. `hire_broker` — hirer transfers fee, `Engagement` PDA created, term start recorded.
2. `record_basis` — after `LATENCY` slots elapse, the vault's allocation is deployed into the
   broker's desk instruments and the cost basis is written on-chain.
3. Live track record is computed client-side: `jupiter_price / cost_basis` per instrument,
   weighted by allocation.
4. `close_engagement` — at term end, the record is finalised and becomes permanent history.
   The vault retains the asset forever.
5. `claim_owner_fees` — broker owner withdraws accrued fees.

The broker never takes custody of the hirer's funds. The fee is the only value transfer from
the hirer, and the vault's allocation is the firm's own capital.

---

## 6. Visual system

**Direction:** bone light mode with ink — a printed brokerage catalog, not a CRT terminal.
This is the deliberate point of separation from quotrons.cash, which is dark warm-black
(`#17130e`) with phosphor green (`#46e35f`).

### Palette

| Token | Value | Use |
|---|---|---|
| `--ground` | `#F4F1EA` | page background, warm bone |
| `--ink` | `#14120F` | body text, 1px rules |
| `--ink-muted` | `#6B6459` | secondary text, labels |
| `--cobalt` | `#2148E2` | brand, links, interactive, focus rings |
| `--gain` | `#1B7F4B` | positive P&L |
| `--loss` | `#C4362B` | negative P&L, live indicators |
| `--paper` | `#FFFFFF` | raised card surfaces |

Light-mode-first by deliberate choice. A dark variant is out of scope for v1; the palette is
defined as CSS custom properties so one can be added later without refactoring.

### Typography

- **Departure Mono** — a pixel monospace, MIT licensed, from `rektdeckard/departure-mono`
  v1.500. Self-hosted as a 22 KB woff2; it is not published to npm.
- It carries **both** roles: the wordmark and section headings, *and* every number, address,
  price and stat. Because it is genuinely monospaced, one face covers display and data, and
  the page reads as a **dot-matrix printout on bone paper** rather than pixel headings bolted
  onto an unrelated mono.
- **Geist** — prose and body copy only. The single non-pixel face on the page.

Pixelta was the original candidate and is rejected: its licence is unverified for web
embedding. Departure Mono's MIT terms carry no embedding restriction.

### Pixel art

`image-rendering: pixelated` on all sprite assets: broker portraits, desk icons, and the hero
floor scene. Sprites are authored at low resolution and scaled by integer factors only.

---

## 7. Page structure

1. **Disclaimer gate** — modal, must acknowledge before entry. Covers experimental software,
   NFA, irreversibility, jurisdictional restrictions on tokenized equities.
2. **Nav + live status strip** — wordmark, nav, connect wallet. Strip shows desks live,
   brokers employed, vault AUM.
3. **Hero** — wordmark, pixel floor scene, one-line statement of what the firm is.
4. **THE FLOOR** — census: brokers minted, employed, idle; total apebits held.
5. **THE DESKS** — five desk cards with live Jupiter prices, vault holdings per desk,
   brokers assigned.
6. **THE ROSTER** — broker cards, sortable by track record, tenure, desk. Hire action per card.
7. **MINT** — mint a broker.
8. **THE RECORD** — vault holdings table: instrument, quantity, cost basis, live price, P&L.
9. **HOW IT WORKS** — the loop, diagrammed.
10. **Funding line + CA** — single lowkey line. No price, no chart, no ticker.
11. **Footer**

---

## 8. Architecture

### Stack

Vite + React + TypeScript + Tailwind v4 + shadcn/ui, matching the existing
`new_projects/airock` project conventions. Solana wallet-adapter for wallet connection,
Helius RPC for chain reads, Jupiter Price API v3 for prices.

### Module boundaries

Each unit has one purpose, a defined interface, and can be tested in isolation.

| Module | Purpose | Depends on |
|---|---|---|
| `config/instruments.ts` | Hardcoded mint constants and desk composition. Pure data, no logic. | nothing |
| `lib/prices/` | Fetch and cache Jupiter v3 prices by mint. Exposes `usePrices(mints)`. | `config/instruments` |
| `lib/chain/` | Typed RPC reads for `Firm`, `Broker`, `Engagement` PDAs. | Anchor IDL |
| `lib/records/` | Pure computation: cost basis vs live price into track records and P&L. | prices, chain |
| `lib/anchor/` | Transaction builders for each instruction. | Anchor IDL, wallet |
| `components/desks/` | Desk board rendering. | prices, records |
| `components/roster/` | Broker cards, sorting, hire entry point. | chain, records |
| `components/sprites/` | Trait-composed pixel portrait renderer. | trait data only |

`lib/records/` is deliberately pure — all P&L math is unit-testable without network or wallet.

### Anchor program `apebits`

**Accounts:**

- `Firm` — config PDA. Treasury address, fee split basis points, epoch length, mint authority,
  per-engagement allocation size.
- `Broker` — PDA per broker. Owner, desk, NERVE, LATENCY, COVERAGE, TENURE, engagement count.
- `Engagement` — PDA. Broker ref, hirer, term start/end slot, fee paid, cost basis snapshot,
  closed flag.

**Instructions:**

`initialize_firm` · `mint_broker` · `hire_broker` · `record_basis` · `close_engagement` ·
`claim_owner_fees`

### Error handling

- **Price feed unavailable** — desks render last-known price with a stale badge and timestamp.
  Never render `$0`, never silently substitute. A missing price disables dependent P&L display
  rather than showing a wrong number.
- **RPC failure** — chain-derived sections show an explicit error state with retry. The static
  narrative sections of the page still render.
- **Wallet rejected / tx failure** — surface the program error, keep the modal open with inputs
  preserved.
- **Scam-mint defence** — mints are compile-time constants; there is no runtime path that could
  resolve a wrong mint.

### Testing

- **Unit** — `lib/records/` P&L math against fixture cost bases and prices, including
  zero-basis and negative-return edge cases. `config/instruments.ts` asserted for mint format
  and no duplicates.
- **Integration** — price hook against a recorded Jupiter fixture; stale and partial-response
  paths exercised.
- **Program** — Anchor tests per instruction: happy path, unauthorised caller, double-hire of an
  engaged broker, closing an already-closed engagement, fee-split arithmetic summing to 100%.
- **Visual** — the desk board and roster rendered against fixture data.

---

## 9. Delivery phasing

> **Revised 2026-08-23.** This section originally specified an Anchor program as Phase 2.
> The stack is now **Railway + Supabase**, and the program is deferred behind an off-chain
> v1. Sections 1–8 are unchanged; only how the broker layer is stored changes. The full
> route to launch is tracked in [`LAUNCH.md`](../../../LAUNCH.md).

**Phase 1 — site and feeds. Complete.** Landing site across five routes, live desk board
against real Jupiter prices, generative pixel roster, disclaimer gate, visual system,
wallet connect over the Wallet Standard. Mint and Hire render in a pre-launch state.

**Phase 2 — off-chain v1 on Supabase.** Brokers, engagements and price history in Postgres.
Hiring is paid in $APE by ordinary transfer to the treasury and verified server-side by
signature; the engagement row is written under the service role. Vault holdings are read
from Solana RPC against a public treasury address.

**Phase 3 — the Anchor program.** The program takes over minting, hiring and fee routing.
Supabase becomes an indexer and price-history store rather than the source of truth.

### What this costs, stated plainly

The spec's second design principle is that no number is invented. Under Phase 2 that holds
for prices and for vault holdings — both verifiable by anyone against Jupiter and Solana —
and **does not hold** for engagements and track records, which are rows the firm writes.

This is an acceptable trade for shipping, and it is not acceptable to paper over. Site copy
must not describe broker records as trustless until Phase 3 lands. "Arithmetic on public
data" is a fair claim for holdings and P&L; it is not a fair claim for a hire count.

---

## 10. Open items

1. **Fee split percentages** — 60/30/10 is a placeholder default (see §5). Confirm before
   launch. Phase 1 does not depend on it; Phase 2 cannot start without it.
2. **$APE contract address** — pending the tokens.xyz launch. Typed `string | null`, so
   its absence renders as "token not live yet" rather than a placeholder string.
3. **Vault treasury address** — pending; required for the auditable-holdings link.

*Closed:* the font licence question. Departure Mono (MIT) replaces Pixelta.
