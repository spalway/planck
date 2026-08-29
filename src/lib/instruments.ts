/**
 * The firm's instrument registry.
 *
 * Every mint below was resolved and price-verified against Jupiter Price API
 * v3 on 2026-08-23. They are hardcoded deliberately: every one of these
 * symbols has scam duplicates on Solana. `SPYX` resolves to a $0 token,
 * `METAx` is cloned on pump.fun, and `OUSG` resolves to an impersonation
 * calling itself "J.P. Morgan Tokenized Money Fund". There is no runtime
 * symbol-lookup path in this codebase, and there must never be one.
 *
 * xStocks authenticity can be cross-checked against the Backed deployer
 * S7vYFFWH6BjJyEsdrPQpqpYTqLTrPRK6KW3VwsJuRaS.
 */

export type DeskId = "equities" | "index" | "bullion" | "yield" | "credit"

export type Instrument = {
  mint: string
  symbol: string
  name: string
  desk: DeskId
}

export type Desk = {
  id: DeskId
  label: string
  blurb: string
}

export const DESKS: readonly Desk[] = [
  {
    id: "equities",
    label: "EQUITIES",
    blurb: "Single-name tokenized equity, issued by Backed as xStocks.",
  },
  {
    id: "index",
    label: "INDEX",
    blurb: "Broad-market exposure. The whole tape in one line.",
  },
  {
    id: "bullion",
    label: "BULLION",
    blurb: "Allocated gold, redeemable against physical bars.",
  },
  {
    id: "yield",
    label: "YIELD",
    blurb: "Tokenized short-term treasuries. The firm's floor.",
  },
  {
    id: "credit",
    label: "CREDIT",
    blurb: "Overcollateralized private credit via Maple.",
  },
] as const

export const INSTRUMENTS: readonly Instrument[] = [
  // EQUITIES — Backed Finance xStocks
  { mint: "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg", symbol: "NVDAx", name: "NVIDIA xStock", desk: "equities" },
  { mint: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB", symbol: "TSLAx", name: "Tesla xStock", desk: "equities" },
  { mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp", symbol: "AAPLx", name: "Apple xStock", desk: "equities" },
  { mint: "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu", symbol: "METAx", name: "Meta xStock", desk: "equities" },
  { mint: "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN", symbol: "GOOGLx", name: "Alphabet xStock", desk: "equities" },
  { mint: "Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu", symbol: "COINx", name: "Coinbase xStock", desk: "equities" },
  { mint: "XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ", symbol: "MSTRx", name: "MicroStrategy xStock", desk: "equities" },

  // INDEX
  { mint: "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W", symbol: "SPYx", name: "SP500 xStock", desk: "index" },
  { mint: "Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ", symbol: "QQQx", name: "Nasdaq xStock", desk: "index" },

  // BULLION
  { mint: "5GgRAEmv8ZxF2PR5hY72Qs5x1bnQ6UK2RbTPoqJ3wSwW", symbol: "PAXG", name: "PAX Gold", desk: "bullion" },
  { mint: "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re", symbol: "GLDx", name: "Gold xStock", desk: "bullion" },

  // YIELD
  { mint: "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6", symbol: "USDY", name: "Ondo US Dollar Yield", desk: "yield" },

  // CREDIT
  { mint: "AvZZF1YaZDziPY2RCK4oJrRVrbN3mTD9NL24hPeaZeUj", symbol: "syrupUSDC", name: "Maple Syrup USDC", desk: "credit" },
] as const

export const ALL_MINTS: readonly string[] = INSTRUMENTS.map((i) => i.mint)

const BY_MINT = new Map(INSTRUMENTS.map((i) => [i.mint, i]))

export function instrumentByMint(mint: string): Instrument | undefined {
  return BY_MINT.get(mint)
}

export function instrumentsForDesk(desk: DeskId): Instrument[] {
  return INSTRUMENTS.filter((i) => i.desk === desk)
}

/**
 * The instruments a broker actually carries.
 *
 * This is COVERAGE made concrete. The trait was an abstract number for a
 * while, and the card showed "coverage 5" with nothing behind it. A broker
 * holds min(coverage, deskSize) instruments off his own desk, so the surplus
 * that converts to nerve is visibly the surplus rather than a silent rule.
 *
 * Deterministic from the broker id: the same broker always carries the same
 * book, on the site and in the social image.
 *
 * The Broker import is type-only, so this does not create a cycle with
 * brokers.ts at runtime.
 */
export function instrumentsForBroker(b: BrokerLike): Instrument[] {
  const pool = instrumentsForDesk(b.desk)
  const want = Math.min(Math.max(1, b.coverage), pool.length)

  // FNV-1a over the id, then a rotation. Slicing from a hashed offset keeps
  // the book stable and gives different brokers different starting points.
  let h = 2166136261
  for (let i = 0; i < b.id.length; i++) {
    h ^= b.id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const start = Math.abs(h) % pool.length

  const out: Instrument[] = []
  for (let i = 0; i < want; i++) out.push(pool[(start + i) % pool.length])
  return out
}

/** Just enough of a Broker to pick a book, so instruments.ts imports nothing. */
type BrokerLike = { id: string; desk: DeskId; coverage: number }
