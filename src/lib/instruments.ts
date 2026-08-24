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
