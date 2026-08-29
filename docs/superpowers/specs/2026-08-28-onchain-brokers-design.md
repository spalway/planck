# PLANCKBITS — On-Chain Brokers, Chimp Roster, Deflationary Burn

**Date:** 2026-08-28
**Status:** Awaiting review
**Supersedes parts of:** [`2026-08-23-planckbits-design.md`](2026-08-23-planckbits-design.md)

---

## 1. Summary

Three changes, one spec, because they are coupled through a byte budget.

1. **The roster becomes chimps.** 24×24 forward-facing pixel brokers with a real
   trait ladder and five scarcity tiers, replacing the 16×16 humans.
2. **Minting moves on chain.** An Anchor program owns the broker record. The
   rendered PFP rides along *inside the mint transaction* as a base64 PNG in an
   SPL Memo, and the program stores its hash.
3. **The mint is paid and deflationary.** 0.1 ◎ per broker, swept into a
   buyback that burns $PLANCK supply.

They are one spec because Solana's 1,232-byte transaction limit decides the
sprite size, and the sprite size decides what the program can carry.

**Two-audience test.** *Trencher:* mint a chimp for 0.1 ◎, one per wallet, the
rare ones are cyan, and every mint burns supply. *Technical:* the image is in
the transaction and hashed on chain, the traits are reproducible from chain
state, and the burn is `E = hf` with a checkable `h`.

---

## 2. Decisions taken

| # | Decision | Rejected alternative |
|---|---|---|
| D1 | Broker is a program-owned **PDA record**, not an NFT | Metaplex Core, Token-2022 metadata |
| D2 | **Memo carries the PNG; the PDA stores its hash** | Raw pixels in the account — 2× rent, no room for the memo |
| D3 | **24×24** sprite | 32×32 — exceeds the memo ceiling once accessories load |
| D4 | Rarity is **desk → outfit, stats → ornaments, tier → ground and garment set** | Tier alone; stats alone |
| D5 | Mint is **paid 0.1 ◎, no holder check**; hiring stays holder-gated | Holder gate on mint; SOL fee on hire too |
| D6 | **One mint per wallet**, enforced by PDA seeds | A database uniqueness check |
| D7 | Traits rolled **on chain from the slot hash** | Server-signed rolls; commit-reveal |
| D8 | **Keeper swaps, program burns permissionlessly** | Full Jupiter CPI crank — deferred to v2 |
| D9 | Delete the `chipperton` Supabase project; planckbits keeps its own | Migrating planckbits into it |

---

## 3. Verified constraints

Everything below was checked against the Solana MCP corpus or measured, not
recalled. These numbers are load-bearing — if any changes, revisit §5.

| Constraint | Value | Source |
|---|---|---|
| Max serialized transaction (legacy, v0) | **1,232 bytes** | `PACKET_DATA_SIZE`, Solana docs |
| v1 transaction limit | 4,096 bytes — **not active on any cluster** | Targeted Agave v4.2 |
| SPL Memo, unsigned, default compute budget | **~566 bytes** single-byte UTF-8 | SPL Memo docs |
| CPI account-info limit | **64** — cited as the reason wrapping Jupiter is hard | SIMD-0339 |
| Rent-exempt minimum | `(128 + bytes) × 6960` lamports | standard formula |

**Measured sprite sizes** (`sharp`, 16-colour indexed PNG, max compression):

| Case | PNG | base64 |
|---|---|---|
| plain common | 256 B | 344 ch |
| hat + cigarette | 270 B | 360 ch |
| epic + headset + cigar | 264 B | 352 ch |
| legendary, busiest | 284 B | **380 ch** |

Worst case leaves **186 characters** under the memo ceiling.

**Why the swap cannot be atomic with the mint.** A Jupiter `shared_accounts_route`
carries ~30+ accounts — 960+ bytes of account keys before any route data. Add
the 380-char memo and it is far past 1,232. SIMD-0339 names Jupiter explicitly
as the case that breaks the 64-account CPI limit. The buyback therefore happens
in a **separate transaction**. This is a constraint, not a preference.

---

## 4. The character system

### 4.1 Base

24×24, forward-facing, **mirror-symmetric by construction** — built from span
definitions that paint a column and its mirror together, with width and
symmetry asserted in tests. Not symmetric by eye.

Chosen over the current 16×16 because 576 pixels versus 256 is what buys
beanies, sunglasses and cigarettes as *distinguishable* shapes.

### 4.2 Layers

Eight layers, back to front. Each is fed by one trait — plus the seed where a
trait selects a palette rather than a single value.

| Layer | Rows | Driven by |
|---|---|---|
| Ground | all | tier |
| Garment | 16–23 | desk (shape) + tier (palette) |
| Fur | — | tier (palette) + seed (choice within it) |
| Face | 7–14 | fixed |
| Collar / tie | 17–18 | **desk** |
| Headwear | **0–6** | nerve |
| Eyewear / comms | **7–10** | latency |
| Mouth | **12–14** | coverage |

**Two rules, both learned from a failed first pass.**

- **R1 — Layers own disjoint row bands.** The first attempt let hat brims sit at
  the eye line; every chimp looked blindfolded and all five hats read as the
  same wide band. Headwear may not draw below row 6.
- **R2 — At most two accessories.** A third erases the face at this size. The
  sprite shows a broker's *strongest* traits, not all of them. Enforced by a
  throw in `compose()`, not by convention.

**One deliberate asymmetry:** the mouth accessory. A cigarette pointing at the
viewer is an unreadable dot; angled out it reads instantly. It is the only thing
that breaks the axis, which is why the eye goes to it.

### 4.3 Occupations

Read off the instruments actually on each desk, so the outfit is information.

| Desk | Instruments | Occupation | Garment | Headwear |
|---|---|---|---|---|
| EQUITIES | NVDA, TSLA, AAPL, META, GOOGL, COIN, MSTR | tech analyst | hoodie | beanie |
| INDEX | SPY, QQQ | floor trader | trading jacket | cap + headset |
| BULLION | PAXG, GLD | vault keeper | coveralls | hard hat |
| YIELD | USDY | treasury clerk | shirtsleeves | eyeshade visor |
| CREDIT | syrupUSDC | underwriter | three-piece suit | fedora |

### 4.4 Tiers

Fur is the scarcity signal. Naturals at the bottom, impossible colours at the top.

| Tier | Odds | Fur |
|---|---|---|
| COMMON | 62% | browns |
| UNCOMMON | 25% | soot, sand, russet, grey |
| RARE | 9% | slate, olive, mauve, bone |
| EPIC | 3.5% | **cyan, magenta, acid green** |
| LEGENDARY | 0.5% | **chrome, ultraviolet, gold** — on near-black ground |

EPIC and LEGENDARY also darken the outline and ground, so a rare chimp is
legible as rare in a wall of thumbnails, not only up close.

**Honest note.** Tier is a rolled trait that drives nothing mechanical. That
breaks the codebase's existing rule that no trait is decorative. It is stored on
chain so it is at least *verifiable* rather than authored, and site copy must not
imply it affects performance.

### 4.5 Assigned instruments

A broker covers `min(coverage, deskSize)` instruments, chosen deterministically
from the seed. This makes `coverage` concrete — it is the list on his card, with
ticker, name, logo and live price — and it is what the landing-page dossier shows.

---

## 5. The program

Anchor, built in WSL2 per the `solana-wsl-workflow` skill. Devnet first.

### 5.1 Accounts

```
Broker    PDA ["broker", owner]        ~96 B   rent ≈ 0.0016 ◎
  owner: Pubkey · traits: [u8; 6] · image_hash: [u8; 32]
  minted_at: i64 · bump: u8

Treasury  PDA ["treasury"]             SOL only, holds mint fees
BurnVault PDA ["burn_vault"]           $PLANCK ATA, authority = program
Config    PDA ["config"]               planck_mint, price, authority, counters
```

**One mint per wallet is free.** Seeding Broker on `owner` means a second mint
fails because the account already exists. Not a check — a fact about the address
space. It is bypassable with more wallets; the 0.1 ◎ is what bounds that, and the
site should say so rather than claim scarcity it does not have.

### 5.2 `mint_broker` and `inscribe` — TWO transactions

> **Amended 2026-08-29, during implementation.** The original spec had the
> memo ride along inside the mint. That is impossible, and the contradiction
> was mine: D2 says the client puts the rendered PNG in the mint transaction,
> D7 says the program rolls the traits. If the program rolls them, the client
> cannot know what the broker looks like when it builds that transaction, so
> it cannot draw it. You cannot paint the chimp before you know its face.
>
> It cannot be patched by having the program check the image either —
> rendering a PNG on chain means running deflate in BPF.
>
> So it splits in two. Both were built and proven; measurements below are
> from the real run, not estimates.

**Tx 1 — `mint_broker`.** Transfers 0.1 ◎ payer → Treasury, rolls traits from
the **SlotHashes sysvar**, writes the Broker PDA with `image_hash` zeroed.

**Tx 2 — `inscribe`.** Two instructions:

1. **SPL Memo** — nothing but the base64 PNG, rendered from the traits the
   chain just rolled. Pure, so paste → base64 decoder → the chimp appears.
2. **`inscribe`** — reads the memo back through the **Instructions sysvar**,
   hashes it, writes the hash to the broker. Owner-only, once, never replaced.

**Measured on a live deployment:** the inscribe transaction is **624 bytes**
against the 1,232 limit, carrying a 344-char portrait.

**What the chain does and does not prove.** The program stores a hash of
whatever bytes it is shown. It cannot render a PNG, so it cannot check the
image against the traits. Anyone else can — re-render from the on-chain traits
via `src/lib/onchain-portrait.ts`, hash, compare. A faked inscription is
**publicly detectable**, and that is the claim to make. Not "proven on chain".

**Trait rolling.** Derived from the slot hash at execution, so the roll cannot be
simulated reliably — the slot moves before the transaction lands. A bot can still
grind, but each attempt costs a fresh wallet *and* 0.1 ◎. Bounded, not prevented.
**Do not claim provable fairness on the site.**

**Permanence.** Ordinary RPCs prune transaction history; only archival nodes keep
old transactions. The pixels live in the ledger, the *hash* lives in an account
served by every RPC forever. Copy must say "in the transaction, hashed on chain",
never "on chain forever".

### 5.3 `burn`

Permissionless. Anyone may call it; it burns the entire BurnVault balance via
`invoke_signed` with the program's seeds and emits an event with the amount and
the running total.

The keeper does the SOL → $PLANCK swap as an ordinary Jupiter transaction and
sends the proceeds to BurnVault. **The swap leg is operated; the burn leg is
on-chain, permissionless and public.** Site copy must draw that line exactly.

v2 replaces the keeper with an on-chain Jupiter CPI crank behind the same `burn`
call. No client change when it lands.

---

## 6. The Planck mechanic

**E = hf.** Energy comes in discrete packets proportional to frequency.

| Physics | The firm |
|---|---|
| **h** — quantum of action | **0.1 ◎**, the indivisible price of one unit of labor |
| **f** — frequency | mints per epoch: how fast the floor is hiring |
| **E** — energy released | supply destroyed that epoch |

`E = h·f`. Given a fixed mint price this is arithmetic, not metaphor, and anyone
can check it against the chain.

Two things stop it reading as bolted on:

1. **The vocabulary was already there.** The site says a planckbit is "the
   smallest bit of a real thing you can own." That is a quantum.
2. **The burn is genuinely quantized.** The crank fires only on whole multiples
   of `h`, so the burn curve is a **staircase, not a line** — which is what
   quantization looks like, falling out of the mechanic rather than drawn on top.

**Site surface:** live `h`, `f`, `E`, cumulative supply destroyed, and the
staircase. **Supply and burn only — no price, no chart, no ticker.**

---

## 7. Helius

Three jobs. All degrade the way this codebase already degrades: `503` with a
reason, rendered as a state rather than an error.

| Use | Call |
|---|---|
| RWA token logos for the 13 mints | DAS `getAssetBatch`, cached server-side, never hotlinked |
| Vault holdings, $PLANCK supply for the burn counter | standard RPC |
| Holder count | **stays on Birdeye** — not a standard RPC call |

Fills `SOLANA_RPC`, which currently sits unread in `.env.example`.

---

## 8. Site changes

- **`BrokerShowcase` becomes a dossier.** Portrait right; left panel carries
  name, ID, desk, tier, stat bars, and the broker's covered RWAs with logo,
  ticker, name and live price. Both halves swap together on the existing 2.6s
  cycle, and it keeps `usePrefersReducedMotion`.
- **RWA board on the landing page.** Reuses `DeskBoard`, now with Helius logos.
- **Burn panel.** `h`, `f`, `E`, cumulative burn, staircase.
- **`/mint`** loses the holder gate, gains price, one-per-wallet state, wallet
  signing, and the explorer link with the decode instructions.
- **`BrokerCard`** gains tier and the covered-instrument list.

The em-dash rule from the existing spec holds throughout: an absent number
renders as `—`, never `$0`.

---

## 9. Data model

**Delete the `chipperton` project** (`rqpxxubpfwnxcwqbluxo`). Irreversible —
confirm the ref before running. planckbits keeps `feutpsjkftlpfatcatap`.

Migration `0004_onchain_brokers.sql`:

- `brokers`: add `tier`, `fur`, `headwear`, `eyewear`, `mouth`, `image_hash`,
  `mint_signature`, and a **unique** constraint on `owner_wallet` — mirrors the
  PDA constraint
- new `burns`: `signature` PK, `planck_burned` (base units), `sol_spent`
  (lamports), `burned_at` — one row per on-chain `burn` event
- new `instrument_metadata`: `mint` PK, `image_url`, `fetched_at` — the Helius cache
- re-seed the 24 founding brokers as chimps with tiers

Supabase demotes to an index of chain state. The program is the source of truth.

---

## 10. Testing

Extending the existing 192-test suite:

1. **Every sprite row is 24 wide and mirror-symmetric** — except the declared
   mouth band.
2. **`compose()` throws on a third accessory.** R2 enforced, not assumed.
3. **Worst-case base64 ≤ 420 chars** across every trait combination, so a rare
   roll can never produce an unmintable transaction.
4. **Composed transaction ≤ 1,232 bytes** for the worst-case sprite.
5. **Server and client agree on desk sizes and effective nerve** — existing rule,
   now extended to tier odds and instrument assignment.
6. **Tier odds sum to 1.0** and match the program's roll table.
7. Program: one-mint-per-wallet rejects the second attempt; `burn` empties the
   vault; a memo-hash mismatch fails the transaction.

---

## 11. Blocked on you

| # | Input | Unblocks |
|---|---|---|
| B1 | Helius API key | RWA logos, vault, supply |
| B2 | Keeper wallet + funding | the swap leg |
| B3 | $PLANCK mint address | burn, hire gate |
| B4 | Devnet SOL | deploy |
| B5 | Confirm chipperton deletion | §9 |

---

## 12. The honesty line

The 2026-08-23 spec set the rule: the site claims its numbers are derived, not
authored. This spec moves the line.

**Becomes true:** broker existence, ownership, traits, tier, mint count and burn
totals — all on chain.

**Still not true:** engagements and track records remain rows the firm writes.

**Newly needs care:**

- The swap leg is operated. Say "the firm buys, the program burns", not "the
  protocol buys back".
- Trait rolls are grind-resistant, not grind-proof.
- Transaction history is prunable. "In the transaction, hashed on chain."
- Tier is cosmetic and must never be implied to affect performance.

---

## 13. Staging

This spec is deliberately wider than one implementation plan. It is four, in
this order — each one leaves the site shippable.

| Phase | Delivers | Depends on |
|---|---|---|
| **P1 · Art** | 24×24 chimps, layers, tiers, instrument assignment, the sprite tests, re-seeded roster. Pure frontend + fixtures. | nothing |
| **P2 · Site** | Dossier showcase, landing RWA board, tier on cards, Helius logo cache | P1, B1 |
| **P3 · Program** | Anchor program on devnet: `mint_broker`, memo + hash, treasury, one-per-wallet. Live site still mints to Postgres. | P1, B4 |
| **P4 · Burn** | `burn` instruction, keeper, burn panel, `E = hf` copy, indexer | P3, B2, B3 |

P1 is the only phase blocked on nothing, which is why it goes first. P3 must not
begin before P1 is frozen — the program hashes the rendered PNG, so a sprite
change after deploy invalidates every stored hash.

---

## 14. Out of scope

Secondary market · hire flow on chain · Jupiter CPI crank (v2) · mainnet deploy ·
NFT wrapper · governance.
