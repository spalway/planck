# PLANCKBITS Site + Live Feeds — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the complete PLANCKBITS landing site with a live desk board driven by real Jupiter prices for 13 verified Solana RWA mints, with mint/hire rendered in a pre-launch state.

**Architecture:** A pure-data core (`instruments.ts`), a thin network client (`jupiter-price.ts`), pure computation (`records.ts`, `brokers.ts`), one hook bridging network to React (`use-prices.ts`), and presentational components that receive data as props. All P&L math is testable without network or wallet. Jupiter is called directly from the browser — it sends permissive CORS, so no proxy is needed.

**Tech Stack:** Vite 8, React 19, TypeScript ~6, Tailwind v4 (CSS-first via `@theme inline`), shadcn v4 (`base-nova` style), Vitest + Testing Library, Jupiter Price API v3.

**Spec:** `docs/superpowers/specs/2026-08-23-planckbits-design.md`

**Out of scope (Phase 2, separate plan):** Anchor program, wallet connect, on-chain reads, mint/hire transactions.

## Global Constraints

- **Never resolve an instrument by ticker symbol.** All 13 mints are compile-time constants in `src/lib/instruments.ts`. No runtime symbol lookup path may exist. Every symbol has scam duplicates on Solana.
- **No invented numbers.** Every displayed figure traces to a live feed or fixture data explicitly labelled as such. Never render `$0` as a fallback; a missing price disables dependent display.
- **The token stays lowkey.** One funding line and the contract address. No price display, no chart, no ticker widget anywhere.
- **Pixel art is illustration only.** All UI structure uses real 1px borders and SVG. Zero box-drawing characters in interface chrome.
- **Light mode only.** No `.dark` variant, no `next-themes`.
- **Code style (match `new_projects/airock`):** double quotes, no semicolons, named exports only, kebab-case filenames, `/** */` doc comments explaining *why*, `console.warn("[PLANCKBITS] ...")` for recoverable failures, network functions take `signal?: AbortSignal` and return `null` on failure rather than throwing.
- **Palette (exact):** `--ground #F4F1EA`, `--ink #14120F`, `--ink-muted #6B6459`, `--cobalt #2148E2`, `--gain #1B7F4B`, `--loss #C4362B`, `--paper #FFFFFF`.
- **Commit after every task.** Conventional commit prefixes (`feat:`, `test:`, `chore:`).

---

### Task 1: Project scaffold, design tokens, and test harness

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `.prettierrc`, `vitest.config.ts`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/lib/utils.ts`
- Create: `src/vite-env.d.ts`
- Test: `src/lib/utils.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `cn(...inputs: ClassValue[]): string` from `@/lib/utils`; the `@` → `./src` path alias; CSS custom properties `--ground --ink --ink-muted --cobalt --gain --loss --paper` and font tokens `--font-sans --font-display --font-num --font-mono`; `npm test` / `npm run dev` / `npm run typecheck` scripts.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "planckbits",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "format": "prettier --write \"**/*.{ts,tsx}\"",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview"
  },
  "dependencies": {
    "@fontsource-variable/geist": "^5.3.0",
    "@tailwindcss/vite": "^4",
    "clsx": "^2.1.1",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "tailwind-merge": "^3.6.0",
    "tailwindcss": "^4"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^24",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^6",
    "jsdom": "^25.0.1",
    "prettier": "^3.8.3",
    "typescript": "~6",
    "vite": "^8",
    "vitest": "^2.1.8"
  }
}
```

Run: `npm install`

- [ ] **Step 2: Create `vite.config.ts`**

No proxy is needed — Jupiter answers with permissive CORS headers, unlike the tokens.xyz hop in the airock project.

```ts
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // fileURLToPath, not URL.pathname — the latter yields "/C:/..." on
      // Windows and resolution silently fails.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { port: 5190 },
  preview: { port: 5190 },
})
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
})
```

Create `src/test-setup.ts`:

```ts
import "@testing-library/jest-dom/vitest"
```

- [ ] **Step 4: Create the TypeScript configs**

`tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "noEmit": true,
    "strict": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

`.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": false,
  "printWidth": 88
}
```

- [ ] **Step 5: Create `src/index.css` with the design tokens**

```css
@import "tailwindcss";
@import "@fontsource-variable/geist";

@theme inline {
  /* Prose only. The one non-pixel face on the page. */
  --font-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif;
  /* Wordmark and section headings. Departure Mono arrives in Task 8; until
     then these fall through to the system monospace, which is expected. */
  --font-display: "Departure Mono", ui-monospace, monospace;
  /* Every figure on the site. */
  --font-num: "Departure Mono", ui-monospace, monospace;
  /* Addresses and mints, where character width must be fixed. */
  --font-mono: "Departure Mono", ui-monospace, monospace;

  --color-ground: var(--ground);
  --color-ink: var(--ink);
  --color-ink-muted: var(--ink-muted);
  --color-cobalt: var(--cobalt);
  --color-gain: var(--gain);
  --color-loss: var(--loss);
  --color-paper: var(--paper);
}

:root {
  /* Warm bone. A printed brokerage catalog, not a CRT terminal. */
  --ground: #f4f1ea;
  --ink: #14120f;
  --ink-muted: #6b6459;
  --cobalt: #2148e2;
  --gain: #1b7f4b;
  --loss: #c4362b;
  --paper: #ffffff;
}

body {
  background-color: var(--ground);
  color: var(--ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

/* Every number on the site aligns in columns. */
.num {
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
}

/* Sprites are authored small and scaled by integer factors only. */
.pixel {
  image-rendering: pixelated;
}
```

- [ ] **Step 6: Create `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 7: Write the failing test**

`src/lib/utils.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { cn } from "@/lib/utils"

describe("cn", () => {
  it("merges conflicting tailwind classes, last wins", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })

  it("drops falsy values", () => {
    expect(cn("text-ink", false, undefined, "num")).toBe("text-ink num")
  })
})
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 2 tests. (This one passes immediately — it verifies the harness and the `@` alias resolve, which is the actual point of the task.)

- [ ] **Step 9: Create the app entry points**

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PLANCKBITS</title>
    <meta
      name="description"
      content="A labor market for AI broker agents holding real-world assets on Solana."
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:

```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "@/App"
import "@/index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

`src/App.tsx`:

```tsx
export function App() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl">PLANCKBITS</h1>
    </main>
  )
}
```

- [ ] **Step 10: Verify the dev server and typecheck**

Run: `npm run typecheck`
Expected: no errors.

Start the dev server with the preview tool (not a bare shell command) and confirm the page renders bone-coloured with the wordmark.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold vite + react + tailwind v4 with design tokens and vitest"
```

---

### Task 2: Instrument registry

The single source of truth for every mint. Pure data, zero logic, no network.

**Files:**
- Create: `src/lib/instruments.ts`
- Test: `src/lib/instruments.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type DeskId = "equities" | "index" | "bullion" | "yield" | "credit"`
  - `type Instrument = { mint: string; symbol: string; name: string; desk: DeskId }`
  - `type Desk = { id: DeskId; label: string; blurb: string }`
  - `const INSTRUMENTS: readonly Instrument[]` (13 entries)
  - `const DESKS: readonly Desk[]` (5 entries)
  - `const ALL_MINTS: readonly string[]`
  - `function instrumentsForDesk(desk: DeskId): Instrument[]`
  - `function instrumentByMint(mint: string): Instrument | undefined`

- [ ] **Step 1: Write the failing test**

`src/lib/instruments.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import {
  ALL_MINTS,
  DESKS,
  INSTRUMENTS,
  instrumentByMint,
  instrumentsForDesk,
} from "@/lib/instruments"

/** Base58, no 0/O/I/l, and Solana mints are 32-44 chars. */
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

describe("INSTRUMENTS", () => {
  it("holds exactly 13 verified instruments", () => {
    expect(INSTRUMENTS).toHaveLength(13)
  })

  it("has a valid base58 mint for every instrument", () => {
    for (const i of INSTRUMENTS) {
      expect(i.mint, `${i.symbol} mint`).toMatch(BASE58)
    }
  })

  it("has no duplicate mints", () => {
    const mints = INSTRUMENTS.map((i) => i.mint)
    expect(new Set(mints).size).toBe(mints.length)
  })

  it("has no duplicate symbols", () => {
    const symbols = INSTRUMENTS.map((i) => i.symbol)
    expect(new Set(symbols).size).toBe(symbols.length)
  })

  it("assigns every instrument to a declared desk", () => {
    const ids = new Set(DESKS.map((d) => d.id))
    for (const i of INSTRUMENTS) {
      expect(ids.has(i.desk), `${i.symbol} desk`).toBe(true)
    }
  })

  it("leaves no desk empty", () => {
    for (const d of DESKS) {
      expect(instrumentsForDesk(d.id).length, `${d.id}`).toBeGreaterThan(0)
    }
  })

  it("excludes instruments that failed verification", () => {
    // BENJI on Solana is a memecoin, OUSG is a pump.fun impersonation.
    const symbols = INSTRUMENTS.map((i) => i.symbol.toUpperCase())
    expect(symbols).not.toContain("BENJI")
    expect(symbols).not.toContain("OUSG")
  })
})

describe("ALL_MINTS", () => {
  it("covers every instrument exactly once", () => {
    expect(ALL_MINTS).toHaveLength(INSTRUMENTS.length)
    expect(new Set(ALL_MINTS).size).toBe(INSTRUMENTS.length)
  })
})

describe("instrumentByMint", () => {
  it("finds a known mint", () => {
    const found = instrumentByMint("Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg")
    expect(found?.symbol).toBe("NVDAx")
  })

  it("returns undefined for an unknown mint", () => {
    expect(instrumentByMint("nope")).toBeUndefined()
  })
})

describe("instrumentsForDesk", () => {
  it("returns the seven equities", () => {
    expect(instrumentsForDesk("equities")).toHaveLength(7)
  })

  it("returns the single yield instrument", () => {
    const y = instrumentsForDesk("yield")
    expect(y).toHaveLength(1)
    expect(y[0].symbol).toBe("USDY")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- instruments`
Expected: FAIL — cannot resolve `@/lib/instruments`.

- [ ] **Step 3: Write the implementation**

`src/lib/instruments.ts`:

```ts
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
  {
    mint: "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg",
    symbol: "NVDAx",
    name: "NVIDIA xStock",
    desk: "equities",
  },
  {
    mint: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
    symbol: "TSLAx",
    name: "Tesla xStock",
    desk: "equities",
  },
  {
    mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
    symbol: "AAPLx",
    name: "Apple xStock",
    desk: "equities",
  },
  {
    mint: "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu",
    symbol: "METAx",
    name: "Meta xStock",
    desk: "equities",
  },
  {
    mint: "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN",
    symbol: "GOOGLx",
    name: "Alphabet xStock",
    desk: "equities",
  },
  {
    mint: "Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu",
    symbol: "COINx",
    name: "Coinbase xStock",
    desk: "equities",
  },
  {
    mint: "XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ",
    symbol: "MSTRx",
    name: "MicroStrategy xStock",
    desk: "equities",
  },

  // INDEX
  {
    mint: "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W",
    symbol: "SPYx",
    name: "SP500 xStock",
    desk: "index",
  },
  {
    mint: "Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ",
    symbol: "QQQx",
    name: "Nasdaq xStock",
    desk: "index",
  },

  // BULLION
  {
    mint: "5GgRAEmv8ZxF2PR5hY72Qs5x1bnQ6UK2RbTPoqJ3wSwW",
    symbol: "PAXG",
    name: "PAX Gold",
    desk: "bullion",
  },
  {
    mint: "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re",
    symbol: "GLDx",
    name: "Gold xStock",
    desk: "bullion",
  },

  // YIELD
  {
    mint: "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6",
    symbol: "USDY",
    name: "Ondo US Dollar Yield",
    desk: "yield",
  },

  // CREDIT
  {
    mint: "AvZZF1YaZDziPY2RCK4oJrRVrbN3mTD9NL24hPeaZeUj",
    symbol: "syrupUSDC",
    name: "Maple Syrup USDC",
    desk: "credit",
  },
] as const

export const ALL_MINTS: readonly string[] = INSTRUMENTS.map((i) => i.mint)

const BY_MINT = new Map(INSTRUMENTS.map((i) => [i.mint, i]))

export function instrumentByMint(mint: string): Instrument | undefined {
  return BY_MINT.get(mint)
}

export function instrumentsForDesk(desk: DeskId): Instrument[] {
  return INSTRUMENTS.filter((i) => i.desk === desk)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- instruments`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/instruments.ts src/lib/instruments.test.ts
git commit -m "feat: add verified instrument registry for 13 Solana RWA mints"
```

---

### Task 3: Jupiter price client

**Files:**
- Create: `src/lib/jupiter-price.ts`
- Test: `src/lib/jupiter-price.test.ts`

**Interfaces:**
- Consumes: `ALL_MINTS` from `@/lib/instruments`
- Produces:
  - `type PriceQuote = { mint: string; usdPrice: number; priceChange24h: number | null; fetchedAt: number }`
  - `type PriceMap = Record<string, PriceQuote>`
  - `async function fetchPrices(mints: readonly string[], signal?: AbortSignal): Promise<PriceMap | null>`
  - `const PRICE_MAX_AGE_MS = 60_000`
  - `function isStale(q: PriceQuote, now?: number): boolean`

- [ ] **Step 1: Write the failing test**

`src/lib/jupiter-price.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  PRICE_MAX_AGE_MS,
  fetchPrices,
  isStale,
} from "@/lib/jupiter-price"

const MINT_A = "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6"
const MINT_B = "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg"

/** Shape copied from a real Jupiter v3 response. */
const RESPONSE = {
  [MINT_A]: { usdPrice: 1.1410288, decimals: 6, priceChange24h: -0.2919 },
  [MINT_B]: { usdPrice: 259.495, decimals: 8, priceChange24h: 0.1583 },
}

function mockFetch(body: unknown, ok = true) {
  const f = vi.fn().mockResolvedValue({ ok, json: async () => body })
  vi.stubGlobal("fetch", f)
  return f
}

afterEach(() => vi.unstubAllGlobals())

describe("fetchPrices", () => {
  it("maps the response into quotes keyed by mint", async () => {
    mockFetch(RESPONSE)
    const out = await fetchPrices([MINT_A, MINT_B])
    expect(out?.[MINT_A].usdPrice).toBeCloseTo(1.1410288)
    expect(out?.[MINT_B].usdPrice).toBeCloseTo(259.495)
    expect(out?.[MINT_B].priceChange24h).toBeCloseTo(0.1583)
  })

  it("stamps fetchedAt on every quote", async () => {
    mockFetch(RESPONSE)
    const before = Date.now()
    const out = await fetchPrices([MINT_A])
    expect(out?.[MINT_A].fetchedAt).toBeGreaterThanOrEqual(before)
  })

  it("sends mints as a comma-separated ids param", async () => {
    const f = mockFetch(RESPONSE)
    await fetchPrices([MINT_A, MINT_B])
    const url = String(f.mock.calls[0][0])
    expect(url).toContain(`ids=${MINT_A}%2C${MINT_B}`)
  })

  it("returns null on a non-ok response rather than throwing", async () => {
    mockFetch({}, false)
    expect(await fetchPrices([MINT_A])).toBeNull()
  })

  it("returns null on a network error rather than throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
    expect(await fetchPrices([MINT_A])).toBeNull()
  })

  it("skips entries with a missing or non-numeric price, never coercing to 0", async () => {
    mockFetch({ [MINT_A]: { usdPrice: null }, [MINT_B]: { usdPrice: 259.5 } })
    const out = await fetchPrices([MINT_A, MINT_B])
    expect(out?.[MINT_A]).toBeUndefined()
    expect(out?.[MINT_B].usdPrice).toBe(259.5)
  })

  it("returns an empty map, not null, when the response is empty", async () => {
    mockFetch({})
    expect(await fetchPrices([MINT_A])).toEqual({})
  })

  it("returns null without calling fetch when given no mints", async () => {
    const f = mockFetch(RESPONSE)
    expect(await fetchPrices([])).toBeNull()
    expect(f).not.toHaveBeenCalled()
  })

  it("treats a null priceChange24h as unknown rather than zero", async () => {
    mockFetch({ [MINT_A]: { usdPrice: 1.14 } })
    const out = await fetchPrices([MINT_A])
    expect(out?.[MINT_A].priceChange24h).toBeNull()
  })
})

describe("isStale", () => {
  const quote = { mint: MINT_A, usdPrice: 1, priceChange24h: null, fetchedAt: 1000 }

  it("is fresh inside the max age", () => {
    expect(isStale(quote, 1000 + PRICE_MAX_AGE_MS - 1)).toBe(false)
  })

  it("is stale at and beyond the max age", () => {
    expect(isStale(quote, 1000 + PRICE_MAX_AGE_MS)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- jupiter-price`
Expected: FAIL — cannot resolve `@/lib/jupiter-price`.

- [ ] **Step 3: Write the implementation**

`src/lib/jupiter-price.ts`:

```ts
/**
 * Jupiter Price API v3.
 *
 * Called straight from the browser. Jupiter answers with
 * `access-control-allow-origin` echoing the caller and `cache-control:
 * max-age=5`, so there is no proxy, no key, and nothing to leak — unlike
 * tokens.xyz, which needs a server hop.
 *
 * Prices are requested by MINT, never by symbol. See instruments.ts for why.
 */

const PRICE_API = "https://lite-api.jup.ag/price/v3"

/** Past this, a quote renders with a stale badge rather than as current. */
export const PRICE_MAX_AGE_MS = 60_000

export type PriceQuote = {
  mint: string
  usdPrice: number
  /** Percent, signed. Null when Jupiter did not supply one. */
  priceChange24h: number | null
  fetchedAt: number
}

export type PriceMap = Record<string, PriceQuote>

/** The subset of Jupiter's payload we rely on. */
type RawQuote = {
  usdPrice?: number | null
  priceChange24h?: number | null
}

/**
 * Fetch USD prices for the given mints.
 *
 * Returns null when the request itself failed, and an object when it
 * succeeded — possibly a partial one. A mint Jupiter did not price is simply
 * absent from the map. It is never defaulted to zero: a wrong price is worse
 * than a missing one, because the UI can render "—" for absent but cannot
 * detect a fabricated 0.
 */
export async function fetchPrices(
  mints: readonly string[],
  signal?: AbortSignal
): Promise<PriceMap | null> {
  if (mints.length === 0) return null

  const qs = new URLSearchParams({ ids: mints.join(",") })

  try {
    const res = await fetch(`${PRICE_API}?${qs}`, { signal })
    if (!res.ok) return null

    const raw = (await res.json()) as Record<string, RawQuote>
    const fetchedAt = Date.now()
    const out: PriceMap = {}

    for (const [mint, q] of Object.entries(raw ?? {})) {
      const usdPrice = q?.usdPrice
      if (typeof usdPrice !== "number" || !Number.isFinite(usdPrice)) continue

      const change = q?.priceChange24h
      out[mint] = {
        mint,
        usdPrice,
        priceChange24h: typeof change === "number" ? change : null,
        fetchedAt,
      }
    }

    return out
  } catch (e) {
    if ((e as Error).name !== "AbortError") {
      console.warn("[PLANCKBITS] Jupiter price fetch failed:", e)
    }
    return null
  }
}

export function isStale(q: PriceQuote, now: number = Date.now()): boolean {
  return now - q.fetchedAt >= PRICE_MAX_AGE_MS
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- jupiter-price`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/jupiter-price.ts src/lib/jupiter-price.test.ts
git commit -m "feat: add Jupiter price v3 client with partial-response handling"
```

---

### Task 4: Price polling hook

**Files:**
- Create: `src/hooks/use-prices.ts`
- Test: `src/hooks/use-prices.test.ts`

**Interfaces:**
- Consumes: `fetchPrices`, `type PriceMap` from `@/lib/jupiter-price`
- Produces: `function usePrices(mints: readonly string[], intervalMs?: number): { prices: PriceMap; status: "loading" | "ready" | "error"; lastOk: number | null }`

- [ ] **Step 1: Write the failing test**

`src/hooks/use-prices.test.ts`:

```ts
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { usePrices } from "@/hooks/use-prices"

const MINT = "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6"

vi.mock("@/lib/jupiter-price", async (orig) => ({
  ...(await orig<typeof import("@/lib/jupiter-price")>()),
  fetchPrices: vi.fn(),
}))

const { fetchPrices } = await import("@/lib/jupiter-price")
const mockFetchPrices = vi.mocked(fetchPrices)

const QUOTE = {
  [MINT]: { mint: MINT, usdPrice: 1.14, priceChange24h: null, fetchedAt: 1 },
}

afterEach(() => vi.clearAllMocks())

describe("usePrices", () => {
  it("starts in loading with no prices", () => {
    mockFetchPrices.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePrices([MINT]))
    expect(result.current.status).toBe("loading")
    expect(result.current.prices).toEqual({})
  })

  it("moves to ready and exposes the fetched prices", async () => {
    mockFetchPrices.mockResolvedValue(QUOTE)
    const { result } = renderHook(() => usePrices([MINT]))
    await waitFor(() => expect(result.current.status).toBe("ready"))
    expect(result.current.prices[MINT].usdPrice).toBe(1.14)
    expect(result.current.lastOk).not.toBeNull()
  })

  it("reports error when the fetch fails", async () => {
    mockFetchPrices.mockResolvedValue(null)
    const { result } = renderHook(() => usePrices([MINT]))
    await waitFor(() => expect(result.current.status).toBe("error"))
  })

  it("keeps the last good prices when a later poll fails", async () => {
    mockFetchPrices.mockResolvedValueOnce(QUOTE).mockResolvedValue(null)
    const { result } = renderHook(() => usePrices([MINT], 20))
    await waitFor(() => expect(result.current.status).toBe("ready"))
    await waitFor(() => expect(result.current.status).toBe("error"))
    // The board keeps rendering the stale number rather than blanking out.
    expect(result.current.prices[MINT].usdPrice).toBe(1.14)
  })

  it("does not fetch when given no mints", () => {
    renderHook(() => usePrices([]))
    expect(mockFetchPrices).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- use-prices`
Expected: FAIL — cannot resolve `@/hooks/use-prices`.

- [ ] **Step 3: Write the implementation**

`src/hooks/use-prices.ts`:

```ts
import * as React from "react"

import { fetchPrices, type PriceMap } from "@/lib/jupiter-price"

export type PricesState = {
  prices: PriceMap
  status: "loading" | "ready" | "error"
  /** Timestamp of the last successful fetch, or null if none has landed. */
  lastOk: number | null
}

const DEFAULT_INTERVAL_MS = 30_000

/**
 * Poll Jupiter for the given mints.
 *
 * A failed poll does not clear the board. Once prices have landed they stay
 * rendered, flagged stale, until a later poll replaces them — blanking a
 * desk on one dropped request reads as "no data" when the truth is "the
 * number is a minute old".
 */
export function usePrices(
  mints: readonly string[],
  intervalMs: number = DEFAULT_INTERVAL_MS
): PricesState {
  const [prices, setPrices] = React.useState<PriceMap>({})
  const [status, setStatus] = React.useState<PricesState["status"]>("loading")
  const [lastOk, setLastOk] = React.useState<number | null>(null)

  // Join so the effect re-runs on content change, not identity change — the
  // caller almost always passes a fresh array literal.
  const key = mints.join(",")

  React.useEffect(() => {
    if (key === "") return

    const list = key.split(",")
    const controller = new AbortController()
    let cancelled = false

    async function poll() {
      const next = await fetchPrices(list, controller.signal)
      if (cancelled) return

      if (next === null) {
        setStatus("error")
        return
      }

      setPrices(next)
      setLastOk(Date.now())
      setStatus("ready")
    }

    void poll()
    const timer = setInterval(() => void poll(), intervalMs)

    return () => {
      cancelled = true
      controller.abort()
      clearInterval(timer)
    }
  }, [key, intervalMs])

  return { prices, status, lastOk }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- use-prices`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-prices.ts src/hooks/use-prices.test.ts
git commit -m "feat: add price polling hook that survives dropped requests"
```

---

### Task 5: Formatting helpers

**Files:**
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `function usd(n: number | null | undefined): string`
  - `function pct(n: number | null | undefined): string`
  - `const EMPTY = "—"`

- [ ] **Step 1: Write the failing test**

`src/lib/format.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { EMPTY, pct, usd } from "@/lib/format"

describe("usd", () => {
  it("formats with two decimals and a thousands separator", () => {
    expect(usd(4610.6275)).toBe("$4,610.63")
  })

  it("keeps four decimals for sub-dollar prices, where cents hide the move", () => {
    expect(usd(1.141)).toBe("$1.1410")
  })

  it("renders the em dash for null and undefined rather than $0", () => {
    expect(usd(null)).toBe(EMPTY)
    expect(usd(undefined)).toBe(EMPTY)
  })

  it("renders the em dash for NaN and Infinity", () => {
    expect(usd(NaN)).toBe(EMPTY)
    expect(usd(Infinity)).toBe(EMPTY)
  })

  it("formats a real zero as a price", () => {
    expect(usd(0)).toBe("$0.0000")
  })
})

describe("pct", () => {
  it("signs a gain", () => {
    expect(pct(0.9742)).toBe("+0.97%")
  })

  it("signs a loss", () => {
    expect(pct(-0.2919)).toBe("-0.29%")
  })

  it("renders the em dash for null", () => {
    expect(pct(null)).toBe(EMPTY)
  })
})

```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- format`
Expected: FAIL — cannot resolve `@/lib/format`.

- [ ] **Step 3: Write the implementation**

`src/lib/format.ts`:

```ts
/**
 * Display formatting.
 *
 * The one rule that matters: an absent number renders as an em dash, never
 * as zero. A fabricated $0 on a desk board is indistinguishable from a real
 * collapse, and this site's whole claim is that its numbers are real.
 */

export const EMPTY = "—"

function bad(n: number | null | undefined): n is null | undefined {
  return n === null || n === undefined || !Number.isFinite(n)
}

/** Sub-dollar instruments carry four decimals; cents would hide the move. */
export function usd(n: number | null | undefined): string {
  if (bad(n)) return EMPTY
  const digits = Math.abs(n) < 10 ? 4 : 2
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

export function pct(n: number | null | undefined): string {
  if (bad(n)) return EMPTY
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toFixed(2)}%`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- format`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: add display formatting that renders absent numbers as em dash"
```

---

### Task 6: Broker traits and the coverage-overflow rule

**Files:**
- Create: `src/lib/brokers.ts`
- Test: `src/lib/brokers.test.ts`

**Interfaces:**
- Consumes: `type DeskId`, `DESKS`, `instrumentsForDesk` from `@/lib/instruments`
- Produces:
  - `type BrokerTraits = { desk: DeskId; nerve: number; latency: number; coverage: number }`
  - `type Broker = BrokerTraits & { id: string; name: string; effectiveNerve: number; tenureHours: number }`
  - `function effectiveNerve(t: BrokerTraits): number`
  - `function rollBroker(id: string, rand: () => number): Broker`
  - `const ROSTER: readonly Broker[]` — deterministic 24-broker fixture for Phase 1

- [ ] **Step 1: Write the failing test**

`src/lib/brokers.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { ROSTER, effectiveNerve, rollBroker } from "@/lib/brokers"
import { instrumentsForDesk } from "@/lib/instruments"

/** Deterministic stand-in for Math.random, cycling a fixed sequence. */
function seeded(values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

describe("effectiveNerve", () => {
  it("leaves nerve alone when coverage fits the desk", () => {
    // equities holds 7 instruments, so coverage 3 is fully usable.
    expect(effectiveNerve({ desk: "equities", nerve: 40, latency: 10, coverage: 3 })).toBe(40)
  })

  it("converts surplus coverage into nerve on a single-instrument desk", () => {
    // yield holds 1 instrument, so 4 of the 5 coverage points are surplus.
    expect(effectiveNerve({ desk: "yield", nerve: 40, latency: 10, coverage: 5 })).toBe(44)
  })

  it("caps effective nerve at 100", () => {
    expect(effectiveNerve({ desk: "credit", nerve: 98, latency: 10, coverage: 9 })).toBe(100)
  })

  it("adds nothing when coverage exactly equals the desk size", () => {
    const n = instrumentsForDesk("bullion").length
    expect(effectiveNerve({ desk: "bullion", nerve: 50, latency: 10, coverage: n })).toBe(50)
  })
})

describe("rollBroker", () => {
  it("is deterministic for a given random sequence", () => {
    const a = rollBroker("b1", seeded([0.1, 0.2, 0.3, 0.4, 0.5]))
    const b = rollBroker("b1", seeded([0.1, 0.2, 0.3, 0.4, 0.5]))
    expect(a).toEqual(b)
  })

  it("rolls stats inside their declared bounds", () => {
    for (let i = 0; i < 200; i++) {
      const b = rollBroker(`b${i}`, Math.random)
      expect(b.nerve).toBeGreaterThanOrEqual(1)
      expect(b.nerve).toBeLessThanOrEqual(100)
      expect(b.latency).toBeGreaterThanOrEqual(1)
      expect(b.latency).toBeLessThanOrEqual(100)
      expect(b.coverage).toBeGreaterThanOrEqual(1)
      expect(b.effectiveNerve).toBeLessThanOrEqual(100)
      expect(Number.isInteger(b.nerve)).toBe(true)
    }
  })

  it("assigns a real desk", () => {
    const ids = new Set(["equities", "index", "bullion", "yield", "credit"])
    for (let i = 0; i < 100; i++) {
      expect(ids.has(rollBroker(`b${i}`, Math.random).desk)).toBe(true)
    }
  })

  it("gives every broker a name", () => {
    expect(rollBroker("b1", Math.random).name).toMatch(/\S/)
  })
})

describe("ROSTER", () => {
  it("holds 24 brokers", () => {
    expect(ROSTER).toHaveLength(24)
  })

  it("has unique ids", () => {
    expect(new Set(ROSTER.map((b) => b.id)).size).toBe(ROSTER.length)
  })

  it("covers every desk, so no desk card renders empty", () => {
    const covered = new Set(ROSTER.map((b) => b.desk))
    expect(covered.size).toBe(5)
  })

  it("is stable across imports, so the fixture does not reshuffle per render", async () => {
    const again = (await import("@/lib/brokers")).ROSTER
    expect(again[0]).toEqual(ROSTER[0])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- brokers`
Expected: FAIL — cannot resolve `@/lib/brokers`.

- [ ] **Step 3: Write the implementation**

`src/lib/brokers.ts`:

```ts
/**
 * Broker traits.
 *
 * Every trait drives a mechanic; none are decorative. The one subtlety is
 * COVERAGE: the YIELD and CREDIT desks hold a single instrument each, so a
 * high coverage roll would be inert for a third of the roster. Surplus
 * points instead convert to NERVE at mint, which keeps every roll meaningful
 * on every desk. It is computed once, here, not at hire time.
 *
 * The ROSTER below is a deterministic Phase 1 fixture. Phase 2 replaces it
 * with brokers read from chain; the types do not change.
 */

import { DESKS, instrumentsForDesk, type DeskId } from "@/lib/instruments"

export type BrokerTraits = {
  desk: DeskId
  /** Position size as a percent of the vault's per-engagement allocation. */
  nerve: number
  /** Slots between hire and deployment. Lower is better. */
  latency: number
  /** Instruments held simultaneously. Surplus converts to nerve. */
  coverage: number
}

export type Broker = BrokerTraits & {
  id: string
  name: string
  effectiveNerve: number
  tenureHours: number
}

const MAX_NERVE = 100

export function effectiveNerve(t: BrokerTraits): number {
  const deskSize = instrumentsForDesk(t.desk).length
  const surplus = Math.max(0, t.coverage - deskSize)
  return Math.min(MAX_NERVE, t.nerve + surplus)
}

const FIRST = [
  "MILO", "RENA", "OTIS", "VESPA", "HALE", "JUNO", "CASK", "IVO",
  "MARL", "PIPP", "TORR", "ELSA", "GRIT", "NOVA", "BRAM", "QUIN",
  "SABLE", "WREN", "DASH", "FLINT", "ORLA", "PACE", "RUE", "ZED",
]

const LAST = [
  "HOLLOWAY", "STRAND", "VANCE", "OKORO", "DELACROIX", "ASH", "KIRBY",
  "NAKASHIMA", "BELL", "FARRAR", "MOSS", "IBARRA",
]

function pick<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]
}

function roll(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1))
}

export function rollBroker(id: string, rand: () => number): Broker {
  const desk = pick(DESKS, rand).id
  const traits: BrokerTraits = {
    desk,
    nerve: roll(rand, 1, MAX_NERVE),
    latency: roll(rand, 1, 100),
    coverage: roll(rand, 1, 9),
  }

  return {
    ...traits,
    id,
    name: `${pick(FIRST, rand)} ${pick(LAST, rand)}`,
    effectiveNerve: effectiveNerve(traits),
    tenureHours: 0,
  }
}

/**
 * A small deterministic PRNG (mulberry32) so the fixture roster is identical
 * on every load and in every test run. Math.random would reshuffle the floor
 * on each refresh, which reads as fake.
 */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildRoster(): Broker[] {
  const rand = mulberry32(0x504c4b42)
  const out: Broker[] = []

  for (let i = 0; i < 24; i++) {
    const b = rollBroker(`PB-${String(i + 1).padStart(3, "0")}`, rand)
    out.push({ ...b, tenureHours: roll(rand, 0, 4000) })
  }

  // Guarantee every desk appears so no desk card renders an empty roster.
  for (const desk of DESKS) {
    if (out.some((b) => b.desk === desk.id)) continue
    const victim = out.findIndex(
      (b) => out.filter((o) => o.desk === b.desk).length > 1
    )
    const t: BrokerTraits = { ...out[victim], desk: desk.id }
    out[victim] = { ...out[victim], ...t, effectiveNerve: effectiveNerve(t) }
  }

  return out
}

export const ROSTER: readonly Broker[] = buildRoster()
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- brokers`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/brokers.ts src/lib/brokers.test.ts
git commit -m "feat: add broker traits with coverage-overflow conversion to nerve"
```

---

### Task 7: Track-record and P&L computation

The core claim of the site — that its numbers are derived, not authored — lives entirely in this file. It is pure: no network, no React, no wallet.

**Files:**
- Create: `src/lib/records.ts`
- Test: `src/lib/records.test.ts`

**Interfaces:**
- Consumes: `type PriceMap` from `@/lib/jupiter-price`; `instrumentByMint`, `type DeskId` from `@/lib/instruments`
- Produces:
  - `type Holding = { mint: string; quantity: number; costBasisUsd: number }`
  - `type HoldingRecord = Holding & { livePrice: number | null; marketValueUsd: number | null; pnlUsd: number | null; pnlPct: number | null }`
  - `function recordFor(h: Holding, prices: PriceMap): HoldingRecord`
  - `function recordsFor(hs: readonly Holding[], prices: PriceMap): HoldingRecord[]`
  - `function deskTotals(hs: readonly Holding[], prices: PriceMap, desk: DeskId): { costUsd: number; valueUsd: number | null; pnlPct: number | null }`
  - `function vaultTotals(hs: readonly Holding[], prices: PriceMap): { costUsd: number; valueUsd: number | null; pnlUsd: number | null; pnlPct: number | null; priced: number; total: number }`

- [ ] **Step 1: Write the failing test**

`src/lib/records.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import type { PriceMap } from "@/lib/jupiter-price"
import { deskTotals, recordFor, recordsFor, vaultTotals } from "@/lib/records"

const NVDAX = "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg"
const TSLAX = "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB"
const USDY = "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6"

function priced(entries: Record<string, number>): PriceMap {
  return Object.fromEntries(
    Object.entries(entries).map(([mint, usdPrice]) => [
      mint,
      { mint, usdPrice, priceChange24h: null, fetchedAt: Date.now() },
    ])
  )
}

describe("recordFor", () => {
  it("computes a gain from cost basis and live price", () => {
    // 10 units cost $2000 total; now worth $250 each = $2500.
    const r = recordFor(
      { mint: NVDAX, quantity: 10, costBasisUsd: 2000 },
      priced({ [NVDAX]: 250 })
    )
    expect(r.marketValueUsd).toBe(2500)
    expect(r.pnlUsd).toBe(500)
    expect(r.pnlPct).toBeCloseTo(25)
  })

  it("computes a loss", () => {
    const r = recordFor(
      { mint: NVDAX, quantity: 10, costBasisUsd: 3000 },
      priced({ [NVDAX]: 250 })
    )
    expect(r.pnlUsd).toBe(-500)
    expect(r.pnlPct).toBeCloseTo(-16.6667)
  })

  it("leaves every derived field null when the price is missing", () => {
    const r = recordFor({ mint: NVDAX, quantity: 10, costBasisUsd: 2000 }, {})
    expect(r.livePrice).toBeNull()
    expect(r.marketValueUsd).toBeNull()
    expect(r.pnlUsd).toBeNull()
    expect(r.pnlPct).toBeNull()
  })

  it("returns a null percentage rather than Infinity on a zero cost basis", () => {
    const r = recordFor(
      { mint: NVDAX, quantity: 10, costBasisUsd: 0 },
      priced({ [NVDAX]: 250 })
    )
    expect(r.pnlUsd).toBe(2500)
    expect(r.pnlPct).toBeNull()
  })

  it("handles a zero-quantity holding without dividing by zero", () => {
    const r = recordFor(
      { mint: NVDAX, quantity: 0, costBasisUsd: 0 },
      priced({ [NVDAX]: 250 })
    )
    expect(r.marketValueUsd).toBe(0)
    expect(r.pnlPct).toBeNull()
  })
})

describe("recordsFor", () => {
  it("maps every holding, priced or not", () => {
    const out = recordsFor(
      [
        { mint: NVDAX, quantity: 1, costBasisUsd: 100 },
        { mint: TSLAX, quantity: 1, costBasisUsd: 100 },
      ],
      priced({ [NVDAX]: 250 })
    )
    expect(out).toHaveLength(2)
    expect(out[0].pnlUsd).toBe(150)
    expect(out[1].pnlUsd).toBeNull()
  })
})

describe("deskTotals", () => {
  it("sums only the holdings on that desk", () => {
    const holdings = [
      { mint: NVDAX, quantity: 10, costBasisUsd: 2000 },
      { mint: USDY, quantity: 1000, costBasisUsd: 1000 },
    ]
    const t = deskTotals(holdings, priced({ [NVDAX]: 250, [USDY]: 1.14 }), "equities")
    expect(t.costUsd).toBe(2000)
    expect(t.valueUsd).toBe(2500)
    expect(t.pnlPct).toBeCloseTo(25)
  })

  it("reports a null value when any holding on the desk is unpriced", () => {
    const holdings = [
      { mint: NVDAX, quantity: 10, costBasisUsd: 2000 },
      { mint: TSLAX, quantity: 10, costBasisUsd: 2000 },
    ]
    const t = deskTotals(holdings, priced({ [NVDAX]: 250 }), "equities")
    // A partial sum would understate the desk and read as a crash.
    expect(t.valueUsd).toBeNull()
    expect(t.pnlPct).toBeNull()
    expect(t.costUsd).toBe(4000)
  })

  it("returns zero cost and null value for a desk with no holdings", () => {
    const t = deskTotals([], {}, "credit")
    expect(t.costUsd).toBe(0)
    expect(t.valueUsd).toBeNull()
  })
})

describe("vaultTotals", () => {
  it("aggregates across desks and counts how many are priced", () => {
    const holdings = [
      { mint: NVDAX, quantity: 10, costBasisUsd: 2000 },
      { mint: USDY, quantity: 1000, costBasisUsd: 1000 },
    ]
    const t = vaultTotals(holdings, priced({ [NVDAX]: 250, [USDY]: 1.14 }))
    expect(t.costUsd).toBe(3000)
    expect(t.valueUsd).toBeCloseTo(3640)
    expect(t.pnlUsd).toBeCloseTo(640)
    expect(t.priced).toBe(2)
    expect(t.total).toBe(2)
  })

  it("nulls the value when coverage is incomplete but still reports the count", () => {
    const holdings = [
      { mint: NVDAX, quantity: 10, costBasisUsd: 2000 },
      { mint: TSLAX, quantity: 10, costBasisUsd: 2000 },
    ]
    const t = vaultTotals(holdings, priced({ [NVDAX]: 250 }))
    expect(t.valueUsd).toBeNull()
    expect(t.priced).toBe(1)
    expect(t.total).toBe(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- records`
Expected: FAIL — cannot resolve `@/lib/records`.

- [ ] **Step 3: Write the implementation**

`src/lib/records.ts`:

```ts
/**
 * Track records and P&L.
 *
 * The site's whole claim is that its numbers are derived rather than
 * authored, and this is where the deriving happens: market value is
 * quantity times a live Jupiter price, and return is that against a cost
 * basis recorded on chain. Nothing here invents a figure.
 *
 * Two rules the tests pin down:
 *
 *  - A missing price nulls every dependent field rather than contributing
 *    zero. Summing a partially-priced desk understates it, and an
 *    understated desk on a bone-white page reads as a crash.
 *  - A zero cost basis yields a null percentage, not Infinity.
 *
 * Pure by design: no network, no React, no wallet. All of it unit-testable.
 */

import type { PriceMap } from "@/lib/jupiter-price"
import { instrumentByMint, type DeskId } from "@/lib/instruments"

export type Holding = {
  mint: string
  quantity: number
  /** Total USD paid, not per-unit. */
  costBasisUsd: number
}

export type HoldingRecord = Holding & {
  livePrice: number | null
  marketValueUsd: number | null
  pnlUsd: number | null
  pnlPct: number | null
}

export function recordFor(h: Holding, prices: PriceMap): HoldingRecord {
  const quote = prices[h.mint]
  const livePrice = quote?.usdPrice ?? null

  if (livePrice === null) {
    return { ...h, livePrice: null, marketValueUsd: null, pnlUsd: null, pnlPct: null }
  }

  const marketValueUsd = h.quantity * livePrice
  const pnlUsd = marketValueUsd - h.costBasisUsd
  const pnlPct = h.costBasisUsd > 0 ? (pnlUsd / h.costBasisUsd) * 100 : null

  return { ...h, livePrice, marketValueUsd, pnlUsd, pnlPct }
}

export function recordsFor(
  hs: readonly Holding[],
  prices: PriceMap
): HoldingRecord[] {
  return hs.map((h) => recordFor(h, prices))
}

/** Sum a set of records, nulling the total if any leg is unpriced. */
function sumValue(rs: readonly HoldingRecord[]): number | null {
  if (rs.length === 0) return null
  if (rs.some((r) => r.marketValueUsd === null)) return null
  return rs.reduce((acc, r) => acc + (r.marketValueUsd ?? 0), 0)
}

export function deskTotals(
  hs: readonly Holding[],
  prices: PriceMap,
  desk: DeskId
): { costUsd: number; valueUsd: number | null; pnlPct: number | null } {
  const mine = hs.filter((h) => instrumentByMint(h.mint)?.desk === desk)
  const records = recordsFor(mine, prices)

  const costUsd = mine.reduce((acc, h) => acc + h.costBasisUsd, 0)
  const valueUsd = sumValue(records)
  const pnlPct =
    valueUsd !== null && costUsd > 0 ? ((valueUsd - costUsd) / costUsd) * 100 : null

  return { costUsd, valueUsd, pnlPct }
}

export function vaultTotals(
  hs: readonly Holding[],
  prices: PriceMap
): {
  costUsd: number
  valueUsd: number | null
  pnlUsd: number | null
  pnlPct: number | null
  priced: number
  total: number
} {
  const records = recordsFor(hs, prices)

  const costUsd = hs.reduce((acc, h) => acc + h.costBasisUsd, 0)
  const valueUsd = sumValue(records)
  const pnlUsd = valueUsd === null ? null : valueUsd - costUsd
  const pnlPct =
    pnlUsd !== null && costUsd > 0 ? (pnlUsd / costUsd) * 100 : null

  return {
    costUsd,
    valueUsd,
    pnlUsd,
    pnlPct,
    priced: records.filter((r) => r.livePrice !== null).length,
    total: records.length,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- records`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/records.ts src/lib/records.test.ts
git commit -m "feat: add pure P&L computation with null-safe partial pricing"
```

---

### Task 8: Layout primitives, Departure Mono, and the page shell

**Files:**
- Create: `src/components/primitives.tsx`, `src/components/site-header.tsx`, `src/components/site-footer.tsx`
- Create: `public/fonts/DepartureMono-Regular.woff2`
- Create: `public/fonts/DepartureMono-LICENSE.txt`
- Modify: `src/index.css` (add the `@font-face`)
- Modify: `src/App.tsx`
- Test: `src/components/primitives.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`
- Produces:
  - `<Section id label title children />`
  - `<Stat label value hint tone? />` where `tone` is `"neutral" | "gain" | "loss"`
  - `<SiteHeader />`, `<SiteFooter />`

**Font note:** Departure Mono is a pixel monospace under the **MIT licence** — no embedding restriction, unlike the unverified Pixelta this replaces. It is not on npm, so the file is fetched once from the official repo. It carries headings *and* every number, so the page reads as a dot-matrix printout rather than pixel headings bolted onto a normal mono. Geist is left for prose only.

- [ ] **Step 1: Fetch the font and its licence**

One file, 22 KB, from `rektdeckard/departure-mono` v1.500.

```bash
mkdir -p public/fonts
curl -fL -o public/fonts/DepartureMono-Regular.woff2 \
  https://raw.githubusercontent.com/rektdeckard/departure-mono/HEAD/public/assets/DepartureMono-Regular.woff2
curl -fL -o public/fonts/DepartureMono-LICENSE.txt \
  https://raw.githubusercontent.com/rektdeckard/departure-mono/HEAD/LICENSE
```

Verify the download is a real font and not an HTML error page — `curl -f` catches a 404, but a redirect to a login page would still write a file:

```bash
ls -l public/fonts/
file public/fonts/DepartureMono-Regular.woff2
```

Expected: roughly 22 KB, reported as WOFF2 (or at minimum `data`, never `HTML document`). If it came back as HTML, stop and re-check the URL rather than shipping a broken font.

- [ ] **Step 2: Register the face**

Add to `src/index.css`, above the `@theme inline` block:

```css
@font-face {
  font-family: "Departure Mono";
  src: url("/fonts/DepartureMono-Regular.woff2") format("woff2");
  font-weight: 400;
  font-display: swap;
}
```

The `@theme inline` tokens already point at `"Departure Mono"` from Task 1, so nothing else changes — the face simply starts resolving.

- [ ] **Step 3: Write the failing test**

`src/components/primitives.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Section, Stat } from "@/components/primitives"

describe("Stat", () => {
  it("renders label and value", () => {
    render(<Stat label="TERMINALS" value="4,444" />)
    expect(screen.getByText("TERMINALS")).toBeInTheDocument()
    expect(screen.getByText("4,444")).toBeInTheDocument()
  })

  it("colours a gain", () => {
    render(<Stat label="P&L" value="+25.00%" tone="gain" />)
    expect(screen.getByText("+25.00%").className).toContain("text-gain")
  })

  it("colours a loss", () => {
    render(<Stat label="P&L" value="-25.00%" tone="loss" />)
    expect(screen.getByText("-25.00%").className).toContain("text-loss")
  })

  it("uses tabular figures for every value", () => {
    render(<Stat label="X" value="123" />)
    expect(screen.getByText("123").className).toContain("num")
  })

  it("renders an optional hint", () => {
    render(<Stat label="X" value="1" hint="since inception" />)
    expect(screen.getByText("since inception")).toBeInTheDocument()
  })
})

describe("Section", () => {
  it("renders its label, title and children under an addressable id", () => {
    const { container } = render(
      <Section id="desks" label="02" title="THE DESKS">
        <p>body</p>
      </Section>
    )
    expect(screen.getByText("THE DESKS")).toBeInTheDocument()
    expect(screen.getByText("02")).toBeInTheDocument()
    expect(screen.getByText("body")).toBeInTheDocument()
    expect(container.querySelector("#desks")).not.toBeNull()
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- primitives`
Expected: FAIL — cannot resolve `@/components/primitives`.

- [ ] **Step 5: Write the implementation**

`src/components/primitives.tsx`:

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Shared page furniture.
 *
 * Structure here is real borders — 1px ink rules and SVG. Box-drawing
 * characters are reserved for illustration and never used as chrome.
 */

export function Section({
  id,
  label,
  title,
  children,
}: {
  id: string
  label: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-ink/15 py-14">
      <header className="mb-8 flex items-baseline gap-4">
        <span className="num text-xs text-ink-muted">{label}</span>
        <h2 className="font-display text-2xl tracking-tight sm:text-3xl">{title}</h2>
      </header>
      {children}
    </section>
  )
}

const TONE = {
  neutral: "text-ink",
  gain: "text-gain",
  loss: "text-loss",
} as const

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string
  value: string
  hint?: string
  tone?: keyof typeof TONE
}) {
  return (
    <div className="flex flex-col gap-1 border-l border-ink/15 pl-4">
      <span className="text-[0.7rem] tracking-widest text-ink-muted uppercase">
        {label}
      </span>
      <span className={cn("num text-2xl", TONE[tone])}>{value}</span>
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </div>
  )
}
```

`src/components/site-header.tsx`:

```tsx
const NAV = [
  { href: "#floor", label: "FLOOR" },
  { href: "#desks", label: "DESKS" },
  { href: "#roster", label: "ROSTER" },
  { href: "#record", label: "RECORD" },
  { href: "#how", label: "HOW IT WORKS" },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-ground/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3">
        <a href="#top" className="font-display text-lg tracking-tight">
          PLANCKBITS
        </a>
        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-xs tracking-widest text-ink-muted uppercase hover:text-cobalt"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          disabled
          className="cursor-not-allowed border border-ink/25 px-3 py-1.5 text-xs tracking-widest text-ink-muted uppercase"
        >
          Connect · soon
        </button>
      </div>
    </header>
  )
}
```

`src/components/site-footer.tsx`:

```tsx
export function SiteFooter() {
  return (
    <footer className="border-t border-ink/15 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-xs text-ink-muted">
        <p>PLANCKBITS — a labor market for AI broker agents.</p>
        <p>
          Not financial advice. Tokenized equity exposure is restricted in some
          jurisdictions.
        </p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- primitives`
Expected: PASS, 6 tests.

- [ ] **Step 7: Wire the shell into `src/App.tsx`**

```tsx
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export function App() {
  return (
    <div id="top">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4">
        <p className="py-20 font-display text-4xl">PLANCKBITS</p>
      </main>
      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 8: Verify in the browser**

Start the dev server with the preview tool and confirm: bone background, ink text, sticky header, nav anchors present, and the wordmark rendering in Departure Mono — pixel-edged, not the system monospace. If it looks like ordinary Consolas or Menlo, the `@font-face` is not resolving; check the network panel for a 404 on the woff2 before going further.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add layout primitives, pixel display font and page shell"
```

---

### Task 9: Disclaimer gate

**Files:**
- Create: `src/components/disclaimer-gate.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/disclaimer-gate.test.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: `<DisclaimerGate onAccept />`, `const GATE_STORAGE_KEY = "planckbits.disclaimer.v1"`, `function hasAcceptedGate(): boolean`

- [ ] **Step 1: Write the failing test**

`src/components/disclaimer-gate.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  DisclaimerGate,
  GATE_STORAGE_KEY,
  hasAcceptedGate,
} from "@/components/disclaimer-gate"

beforeEach(() => localStorage.clear())

describe("DisclaimerGate", () => {
  it("keeps the accept button disabled until the box is ticked", () => {
    render(<DisclaimerGate onAccept={() => {}} />)
    const accept = screen.getByRole("button", { name: /understand/i })
    expect(accept).toBeDisabled()

    fireEvent.click(screen.getByRole("checkbox"))
    expect(accept).toBeEnabled()
  })

  it("calls onAccept and persists once accepted", () => {
    const onAccept = vi.fn()
    render(<DisclaimerGate onAccept={onAccept} />)

    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: /understand/i }))

    expect(onAccept).toHaveBeenCalledOnce()
    expect(localStorage.getItem(GATE_STORAGE_KEY)).toBe("1")
  })

  it("states the three risks the spec requires", () => {
    render(<DisclaimerGate onAccept={() => {}} />)
    expect(screen.getByText(/experimental/i)).toBeInTheDocument()
    expect(screen.getByText(/not financial advice/i)).toBeInTheDocument()
    expect(screen.getByText(/jurisdiction/i)).toBeInTheDocument()
  })
})

describe("hasAcceptedGate", () => {
  it("is false before acceptance and true after", () => {
    expect(hasAcceptedGate()).toBe(false)
    localStorage.setItem(GATE_STORAGE_KEY, "1")
    expect(hasAcceptedGate()).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- disclaimer-gate`
Expected: FAIL — cannot resolve `@/components/disclaimer-gate`.

- [ ] **Step 3: Write the implementation**

`src/components/disclaimer-gate.tsx`:

```tsx
import * as React from "react"

export const GATE_STORAGE_KEY = "planckbits.disclaimer.v1"

export function hasAcceptedGate(): boolean {
  try {
    return localStorage.getItem(GATE_STORAGE_KEY) === "1"
  } catch {
    // Private browsing can throw on access. Show the gate rather than
    // silently letting someone past it.
    return false
  }
}

const POINTS = [
  "PLANCKBITS is experimental software. Contracts are unaudited and may fail.",
  "Nothing here is financial advice. Nothing here is an offer to buy or sell a security.",
  "Hiring fees are spent and are not refundable. The vault does not sell its holdings.",
  "Tokenized equity exposure is restricted in some jurisdictions, including the United States. Complying with the law where you live is your responsibility.",
  "Holding $PLANCK or a broker grants no equity, no ownership, and no claim on revenue or profit of any company.",
]

export function DisclaimerGate({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = React.useState(false)

  function accept() {
    try {
      localStorage.setItem(GATE_STORAGE_KEY, "1")
    } catch {
      // Persisting is a convenience; entry should not depend on it.
    }
    onAccept()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Risk disclaimer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
    >
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto border border-ink/25 bg-paper p-6">
        <h2 className="font-display text-xl">BEFORE YOU ENTER</h2>

        <ul className="mt-5 flex flex-col gap-3 text-sm leading-relaxed">
          {POINTS.map((p) => (
            <li key={p} className="border-l border-ink/20 pl-3 text-ink-muted">
              {p}
            </li>
          ))}
        </ul>

        <label className="mt-6 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 accent-cobalt"
          />
          <span>
            I have read the above and accept that I may lose everything I risk.
          </span>
        </label>

        <button
          type="button"
          disabled={!checked}
          onClick={accept}
          className="mt-6 w-full bg-cobalt py-3 text-sm tracking-widest text-white uppercase disabled:cursor-not-allowed disabled:bg-ink/20"
        >
          I understand &amp; agree
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- disclaimer-gate`
Expected: PASS, 4 tests.

- [ ] **Step 5: Wire into `src/App.tsx`**

```tsx
import * as React from "react"

import { DisclaimerGate, hasAcceptedGate } from "@/components/disclaimer-gate"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export function App() {
  const [entered, setEntered] = React.useState(hasAcceptedGate)

  return (
    <div id="top">
      {!entered && <DisclaimerGate onAccept={() => setEntered(true)} />}
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4">
        <p className="py-20 font-display text-4xl">PLANCKBITS</p>
      </main>
      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add risk disclaimer gate with persisted acceptance"
```

---

### Task 10: Hero and floor census

**Files:**
- Create: `src/components/hero.tsx`, `src/components/floor-census.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/floor-census.test.tsx`

**Interfaces:**
- Consumes: `Section`, `Stat` from `@/components/primitives`; `ROSTER` from `@/lib/brokers`
- Produces: `<Hero />`, `<FloorCensus brokers />`

- [ ] **Step 1: Write the failing test**

`src/components/floor-census.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FloorCensus } from "@/components/floor-census"
import type { Broker } from "@/lib/brokers"

const BROKERS: Broker[] = [
  { id: "a", name: "MILO ASH", desk: "equities", nerve: 40, latency: 10, coverage: 2, effectiveNerve: 40, tenureHours: 100 },
  { id: "b", name: "RENA BELL", desk: "yield", nerve: 50, latency: 20, coverage: 5, effectiveNerve: 54, tenureHours: 0 },
  { id: "c", name: "OTIS MOSS", desk: "credit", nerve: 60, latency: 30, coverage: 1, effectiveNerve: 60, tenureHours: 250 },
]

describe("FloorCensus", () => {
  it("counts the whole roster", () => {
    render(<FloorCensus brokers={BROKERS} />)
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("splits employed from idle by tenure", () => {
    render(<FloorCensus brokers={BROKERS} />)
    expect(screen.getByText("EMPLOYED")).toBeInTheDocument()
    expect(screen.getByText("IDLE")).toBeInTheDocument()
    // Two brokers have tenure, one has none.
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("reports how many desks are covered", () => {
    render(<FloorCensus brokers={BROKERS} />)
    expect(screen.getByText("DESKS COVERED")).toBeInTheDocument()
    expect(screen.getByText("3 / 5")).toBeInTheDocument()
  })

  it("renders without crashing on an empty floor", () => {
    render(<FloorCensus brokers={[]} />)
    expect(screen.getByText("BROKERS")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- floor-census`
Expected: FAIL — cannot resolve `@/components/floor-census`.

- [ ] **Step 3: Write the implementation**

`src/components/floor-census.tsx`:

```tsx
import { Section, Stat } from "@/components/primitives"
import type { Broker } from "@/lib/brokers"
import { DESKS } from "@/lib/instruments"

export function FloorCensus({ brokers }: { brokers: readonly Broker[] }) {
  const employed = brokers.filter((b) => b.tenureHours > 0).length
  const covered = new Set(brokers.map((b) => b.desk)).size

  return (
    <Section id="floor" label="01" title="THE FLOOR">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="Brokers" value={String(brokers.length)} />
        <Stat label="Employed" value={String(employed)} hint="tenure accruing" />
        <Stat label="Idle" value={String(brokers.length - employed)} hint="available to hire" />
        <Stat label="Desks covered" value={`${covered} / ${DESKS.length}`} />
      </div>
    </Section>
  )
}
```

`src/components/hero.tsx`:

```tsx
export function Hero() {
  return (
    <section className="py-20">
      <p className="text-xs tracking-[0.3em] text-ink-muted uppercase">
        Solana · real-world assets
      </p>

      <h1 className="mt-5 font-display text-5xl leading-[1.05] tracking-tight sm:text-7xl">
        PLANCKBITS
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">
        A labor market for AI broker agents. Mint a broker, and he takes a desk.
        Someone pays to hire him, and the firm's vault buys the real asset behind
        that desk — and never sells it.
      </p>

      <p className="mt-4 max-w-2xl text-sm text-ink-muted">
        A <span className="text-ink">planckbit</span> is the smallest bit of a real
        thing you can own. It is what the firm counts in.
      </p>
    </section>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- floor-census`
Expected: PASS, 4 tests.

- [ ] **Step 5: Wire both into `src/App.tsx`** — add `<Hero />` and `<FloorCensus brokers={ROSTER} />` inside `<main>`, importing `ROSTER` from `@/lib/brokers`, replacing the placeholder paragraph.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add hero and floor census"
```

---

### Task 11: Desk board with live prices

The first component to touch the network. This is the section that proves the numbers are real.

**Files:**
- Create: `src/components/desk-board.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/desk-board.test.tsx`

**Interfaces:**
- Consumes: `usePrices` from `@/hooks/use-prices`; `DESKS`, `instrumentsForDesk`, `ALL_MINTS` from `@/lib/instruments`; `usd`, `pct`, `EMPTY` from `@/lib/format`; `deskTotals`, `type Holding` from `@/lib/records`; `type Broker` from `@/lib/brokers`; `Section` from `@/components/primitives`
- Produces: `<DeskBoard brokers holdings />`

- [ ] **Step 1: Write the failing test**

`src/components/desk-board.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DeskBoard } from "@/components/desk-board"
import type { Broker } from "@/lib/brokers"
import type { Holding } from "@/lib/records"

const NVDAX = "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg"

vi.mock("@/lib/jupiter-price", async (orig) => ({
  ...(await orig<typeof import("@/lib/jupiter-price")>()),
  fetchPrices: vi.fn(),
}))

const { fetchPrices } = await import("@/lib/jupiter-price")
const mockFetchPrices = vi.mocked(fetchPrices)

afterEach(() => vi.clearAllMocks())

const BROKERS: Broker[] = [
  { id: "PB-001", name: "MILO ASH", desk: "equities", nerve: 40, latency: 10, coverage: 2, effectiveNerve: 40, tenureHours: 10 },
  { id: "PB-002", name: "RENA BELL", desk: "equities", nerve: 50, latency: 20, coverage: 3, effectiveNerve: 50, tenureHours: 20 },
  { id: "PB-003", name: "OTIS MOSS", desk: "yield", nerve: 60, latency: 30, coverage: 1, effectiveNerve: 60, tenureHours: 30 },
]

function board(holdings: Holding[] = []) {
  return render(<DeskBoard brokers={BROKERS} holdings={holdings} />)
}

describe("DeskBoard", () => {
  it("renders all five desks", async () => {
    mockFetchPrices.mockResolvedValue({})
    board()
    for (const label of ["EQUITIES", "INDEX", "BULLION", "YIELD", "CREDIT"]) {
      expect(await screen.findByText(label)).toBeInTheDocument()
    }
  })

  it("shows a live price once it lands", async () => {
    mockFetchPrices.mockResolvedValue({
      [NVDAX]: { mint: NVDAX, usdPrice: 259.49, priceChange24h: 0.16, fetchedAt: Date.now() },
    })
    board()
    expect(await screen.findByText("$259.49")).toBeInTheDocument()
    expect(await screen.findByText("+0.16%")).toBeInTheDocument()
  })

  it("shows an em dash, never $0, for an unpriced instrument", async () => {
    mockFetchPrices.mockResolvedValue({})
    board()
    await waitFor(() => expect(screen.getAllByText("—").length).toBeGreaterThan(0))
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument()
    expect(screen.queryByText("$0.0000")).not.toBeInTheDocument()
  })

  it("surfaces a feed error without blanking the board", async () => {
    mockFetchPrices.mockResolvedValue(null)
    board()
    expect(await screen.findByText(/feed unavailable/i)).toBeInTheDocument()
    expect(screen.getByText("EQUITIES")).toBeInTheDocument()
  })

  it("lists every instrument symbol on the board", async () => {
    mockFetchPrices.mockResolvedValue({})
    board()
    expect(await screen.findByText("NVDAx")).toBeInTheDocument()
    expect(screen.getByText("syrupUSDC")).toBeInTheDocument()
    expect(screen.getByText("GLDx")).toBeInTheDocument()
  })

  it("counts the brokers assigned to each desk", async () => {
    mockFetchPrices.mockResolvedValue({})
    board()
    expect(await screen.findByTestId("desk-brokers-equities")).toHaveTextContent("2")
    expect(screen.getByTestId("desk-brokers-yield")).toHaveTextContent("1")
    expect(screen.getByTestId("desk-brokers-credit")).toHaveTextContent("0")
  })

  it("shows the desk's holding value once the vault has deployed", async () => {
    mockFetchPrices.mockResolvedValue({
      [NVDAX]: { mint: NVDAX, usdPrice: 250, priceChange24h: null, fetchedAt: Date.now() },
    })
    board([{ mint: NVDAX, quantity: 10, costBasisUsd: 2000 }])
    expect(await screen.findByTestId("desk-value-equities")).toHaveTextContent("$2,500.00")
  })

  it("shows an em dash for the value of a desk holding nothing", async () => {
    mockFetchPrices.mockResolvedValue({})
    board()
    expect(await screen.findByTestId("desk-value-bullion")).toHaveTextContent("—")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- desk-board`
Expected: FAIL — cannot resolve `@/components/desk-board`.

- [ ] **Step 3: Write the implementation**

`src/components/desk-board.tsx`:

```tsx
import { Section } from "@/components/primitives"
import { usePrices } from "@/hooks/use-prices"
import type { Broker } from "@/lib/brokers"
import { EMPTY, pct, usd } from "@/lib/format"
import { ALL_MINTS, DESKS, instrumentsForDesk } from "@/lib/instruments"
import type { PriceMap } from "@/lib/jupiter-price"
import { deskTotals, type Holding } from "@/lib/records"
import { cn } from "@/lib/utils"

function Row({ mint, symbol, name, prices }: {
  mint: string
  symbol: string
  name: string
  prices: PriceMap
}) {
  const quote = prices[mint]
  const change = quote?.priceChange24h ?? null

  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-ink/10 py-2 first:border-t-0">
      <div className="min-w-0">
        <span className="num text-sm">{symbol}</span>
        <span className="ml-2 truncate text-xs text-ink-muted">{name}</span>
      </div>
      <div className="flex shrink-0 items-baseline gap-3">
        <span className="num text-sm">{usd(quote?.usdPrice)}</span>
        <span
          className={cn(
            "num w-16 text-right text-xs",
            change === null && "text-ink-muted",
            change !== null && change >= 0 && "text-gain",
            change !== null && change < 0 && "text-loss"
          )}
        >
          {change === null ? EMPTY : pct(change)}
        </span>
      </div>
    </div>
  )
}

export function DeskBoard({
  brokers,
  holdings,
}: {
  brokers: readonly Broker[]
  holdings: readonly Holding[]
}) {
  const { prices, status } = usePrices(ALL_MINTS)

  return (
    <Section id="desks" label="02" title="THE DESKS">
      {status === "error" && (
        <p className="mb-6 border border-loss/30 bg-loss/5 px-3 py-2 text-xs text-loss">
          Price feed unavailable. Figures below are the last values received.
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {DESKS.map((desk) => {
          const totals = deskTotals(holdings, prices, desk.id)
          const assigned = brokers.filter((b) => b.desk === desk.id).length

          return (
            <article key={desk.id} className="border border-ink/15 bg-paper p-4">
              <h3 className="font-display text-lg">{desk.label}</h3>
              <p className="mt-1 mb-3 text-xs leading-relaxed text-ink-muted">
                {desk.blurb}
              </p>

              <div className="mb-3 flex items-baseline justify-between border-y border-ink/10 py-2">
                <span
                  data-testid={`desk-brokers-${desk.id}`}
                  className="text-[0.65rem] tracking-widest text-ink-muted uppercase"
                >
                  {assigned} brokers
                </span>
                <span
                  data-testid={`desk-value-${desk.id}`}
                  className="num text-xs"
                >
                  {usd(totals.valueUsd)}
                </span>
              </div>

              <div>
                {instrumentsForDesk(desk.id).map((i) => (
                  <Row key={i.mint} {...i} prices={prices} />
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </Section>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- desk-board`
Expected: PASS, 8 tests.

- [ ] **Step 5: Wire the desk board into `src/App.tsx`** after `<FloorCensus />`.

`VAULT_HOLDINGS` does not exist until Task 14, so pass an empty array for now — Task 14 replaces it:

```tsx
<DeskBoard brokers={ROSTER} holdings={[]} />
```

- [ ] **Step 6: Verify against the real feed**

Start the dev server with the preview tool. Confirm real prices render for all 13 instruments — NVDAx, TSLAx and SPYx in the hundreds; USDY and syrupUSDC near $1.14–1.18; PAXG in the thousands. Check the browser console for `[PLANCKBITS]` warnings and the network panel for a single `lite-api.jup.ag/price/v3` request carrying all 13 mints in one `ids` param.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add desk board driven by live Jupiter prices"
```

---

### Task 12: Broker sprite

**Files:**
- Create: `src/components/broker-sprite.tsx`
- Test: `src/components/broker-sprite.test.tsx`

**Interfaces:**
- Consumes: `type Broker` from `@/lib/brokers`
- Produces: `<BrokerSprite broker size? />`

Deterministic inline SVG rather than bitmap assets: the roster is generative, so 24 hand-drawn PNGs would not survive Phase 2 when brokers come from chain. Each sprite is a fixed 12×12 grid of rects — genuinely pixel art, but composed from traits.

- [ ] **Step 1: Write the failing test**

`src/components/broker-sprite.test.tsx`:

```tsx
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BrokerSprite } from "@/components/broker-sprite"
import type { Broker } from "@/lib/brokers"

const BROKER: Broker = {
  id: "PB-001", name: "MILO ASH", desk: "equities",
  nerve: 40, latency: 10, coverage: 2, effectiveNerve: 40, tenureHours: 100,
}

describe("BrokerSprite", () => {
  it("renders an svg labelled with the broker name", () => {
    const { container } = render(<BrokerSprite broker={BROKER} />)
    const svg = container.querySelector("svg")
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute("aria-label")).toContain("MILO ASH")
  })

  it("is deterministic — the same broker yields identical markup", () => {
    const a = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const b = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    expect(a).toBe(b)
  })

  it("differs between desks, so the floor is visually legible", () => {
    const a = render(<BrokerSprite broker={BROKER} />).container.innerHTML
    const b = render(
      <BrokerSprite broker={{ ...BROKER, desk: "bullion" }} />
    ).container.innerHTML
    expect(a).not.toBe(b)
  })

  it("uses a 12-unit viewBox so pixels stay square", () => {
    const { container } = render(<BrokerSprite broker={BROKER} />)
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 12 12")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- broker-sprite`
Expected: FAIL — cannot resolve `@/components/broker-sprite`.

- [ ] **Step 3: Write the implementation**

`src/components/broker-sprite.tsx`:

```tsx
import type { Broker } from "@/lib/brokers"
import type { DeskId } from "@/lib/instruments"

/**
 * A broker portrait, composed rather than drawn.
 *
 * The roster is generative and Phase 2 reads it from chain, so hand-drawn
 * bitmaps would not survive. This is a 12x12 grid of rects — real pixel art,
 * every pixel placed by trait — and it stays crisp at any scale because it
 * is vector underneath.
 */

const DESK_COLOR: Record<DeskId, string> = {
  equities: "#2148E2",
  index: "#1B7F4B",
  bullion: "#B8860B",
  yield: "#6B6459",
  credit: "#C4362B",
}

const INK = "#14120F"
const SKIN = "#E8C9A8"

/** Rows of a 12x12 sprite. "." transparent, "i" ink, "s" skin, "d" desk colour. */
const BASE = [
  "....iiii....",
  "...iiiiii...",
  "..issssssi..",
  "..isssssss..",
  "..is.ss.ss..",
  "..isssssss..",
  "..issssssi..",
  "...ssssss...",
  "..dddddddd..",
  ".ddddiidddd.",
  ".ddd.dd.ddd.",
  "..dd....dd..",
]

/** A hat brim for high-nerve brokers; a headset for low-latency ones. */
function overlay(b: Broker): string[] {
  const rows = [...BASE]
  if (b.effectiveNerve >= 70) rows[1] = ".iiiiiiiiii."
  if (b.latency <= 30) {
    rows[4] = ".dis.ss.ssid"
    rows[5] = ".dissssssid."
  }
  return rows
}

const FILL: Record<string, string> = { i: INK, s: SKIN }

export function BrokerSprite({ broker, size = 96 }: { broker: Broker; size?: number }) {
  const rows = overlay(broker)
  const desk = DESK_COLOR[broker.desk]

  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      role="img"
      aria-label={`${broker.name}, ${broker.desk} desk`}
      shapeRendering="crispEdges"
      className="pixel"
    >
      {rows.map((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={c === "d" ? desk : FILL[c]}
            />
          )
        )
      )}
    </svg>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- broker-sprite`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/broker-sprite.tsx src/components/broker-sprite.test.tsx
git commit -m "feat: add trait-composed pixel broker sprite"
```

---

### Task 13: Broker cards and roster

**Files:**
- Create: `src/components/broker-card.tsx`, `src/components/roster.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/roster.test.tsx`

**Interfaces:**
- Consumes: `ROSTER`, `type Broker` from `@/lib/brokers`; `BrokerSprite`; `Section`; `DESKS` from `@/lib/instruments`
- Produces: `<BrokerCard broker />`, `<Roster brokers />`, `type SortKey = "tenure" | "nerve" | "latency"`

- [ ] **Step 1: Write the failing test**

`src/components/roster.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Roster } from "@/components/roster"
import type { Broker } from "@/lib/brokers"

const BROKERS: Broker[] = [
  { id: "PB-001", name: "MILO ASH", desk: "equities", nerve: 40, latency: 90, coverage: 2, effectiveNerve: 40, tenureHours: 10 },
  { id: "PB-002", name: "RENA BELL", desk: "yield", nerve: 90, latency: 5, coverage: 5, effectiveNerve: 94, tenureHours: 900 },
  { id: "PB-003", name: "OTIS MOSS", desk: "credit", nerve: 60, latency: 50, coverage: 1, effectiveNerve: 60, tenureHours: 400 },
]

function names() {
  return screen.getAllByTestId("broker-name").map((n) => n.textContent)
}

describe("Roster", () => {
  it("renders every broker", () => {
    render(<Roster brokers={BROKERS} />)
    expect(names()).toHaveLength(3)
  })

  it("sorts by tenure descending by default", () => {
    render(<Roster brokers={BROKERS} />)
    expect(names()).toEqual(["RENA BELL", "OTIS MOSS", "MILO ASH"])
  })

  it("sorts by nerve descending when asked", () => {
    render(<Roster brokers={BROKERS} />)
    fireEvent.click(screen.getByRole("button", { name: /nerve/i }))
    expect(names()[0]).toBe("RENA BELL")
  })

  it("sorts by latency ascending, because lower is better", () => {
    render(<Roster brokers={BROKERS} />)
    fireEvent.click(screen.getByRole("button", { name: /latency/i }))
    expect(names()).toEqual(["RENA BELL", "OTIS MOSS", "MILO ASH"])
  })

  it("filters to one desk", () => {
    render(<Roster brokers={BROKERS} />)
    fireEvent.click(screen.getByRole("button", { name: "YIELD" }))
    expect(names()).toEqual(["RENA BELL"])
  })

  it("shows effective nerve, not the raw roll, so the overflow rule is visible", () => {
    render(<Roster brokers={[BROKERS[1]]} />)
    const card = screen.getByTestId("broker-card-PB-002")
    expect(within(card).getByText("94")).toBeInTheDocument()
  })

  it("renders hire as a disabled pre-launch action", () => {
    render(<Roster brokers={[BROKERS[0]]} />)
    expect(screen.getByRole("button", { name: /hire/i })).toBeDisabled()
  })

  it("says so plainly when a filter matches nothing", () => {
    render(<Roster brokers={[BROKERS[0]]} />)
    fireEvent.click(screen.getByRole("button", { name: "BULLION" }))
    expect(screen.getByText(/no brokers/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- roster`
Expected: FAIL — cannot resolve `@/components/roster`.

- [ ] **Step 3: Write the implementation**

`src/components/broker-card.tsx`:

```tsx
import { BrokerSprite } from "@/components/broker-sprite"
import type { Broker } from "@/lib/brokers"
import { DESKS } from "@/lib/instruments"

function deskLabel(id: Broker["desk"]) {
  return DESKS.find((d) => d.id === id)?.label ?? id.toUpperCase()
}

function Trait({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[0.65rem] tracking-widest text-ink-muted uppercase">
        {label}
      </span>
      <span className="num text-sm">{value}</span>
    </div>
  )
}

export function BrokerCard({ broker }: { broker: Broker }) {
  return (
    <article
      data-testid={`broker-card-${broker.id}`}
      className="flex flex-col border border-ink/15 bg-paper p-4"
    >
      <div className="flex items-start gap-3">
        <BrokerSprite broker={broker} size={56} />
        <div className="min-w-0">
          <h3 data-testid="broker-name" className="truncate font-display text-sm">
            {broker.name}
          </h3>
          <p className="num text-[0.65rem] text-ink-muted">{broker.id}</p>
          <p className="mt-1 text-[0.65rem] tracking-widest text-cobalt uppercase">
            {deskLabel(broker.desk)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5 border-t border-ink/10 pt-3">
        <Trait label="Nerve" value={String(broker.effectiveNerve)} />
        <Trait label="Latency" value={String(broker.latency)} />
        <Trait label="Coverage" value={String(broker.coverage)} />
        <Trait label="Tenure" value={`${broker.tenureHours}h`} />
      </div>

      <button
        type="button"
        disabled
        className="mt-4 w-full cursor-not-allowed border border-ink/20 py-2 text-xs tracking-widest text-ink-muted uppercase"
      >
        Hire · soon
      </button>
    </article>
  )
}
```

`src/components/roster.tsx`:

```tsx
import * as React from "react"

import { BrokerCard } from "@/components/broker-card"
import { Section } from "@/components/primitives"
import type { Broker } from "@/lib/brokers"
import { DESKS, type DeskId } from "@/lib/instruments"
import { cn } from "@/lib/utils"

export type SortKey = "tenure" | "nerve" | "latency"

const SORTS: { key: SortKey; label: string }[] = [
  { key: "tenure", label: "Tenure" },
  { key: "nerve", label: "Nerve" },
  { key: "latency", label: "Latency" },
]

/** Latency sorts ascending — a lower number means faster deployment. */
function compare(a: Broker, b: Broker, key: SortKey): number {
  if (key === "latency") return a.latency - b.latency
  if (key === "nerve") return b.effectiveNerve - a.effectiveNerve
  return b.tenureHours - a.tenureHours
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border px-3 py-1 text-[0.65rem] tracking-widest uppercase",
        active
          ? "border-cobalt bg-cobalt text-white"
          : "border-ink/20 text-ink-muted hover:border-ink/40"
      )}
    >
      {children}
    </button>
  )
}

export function Roster({ brokers }: { brokers: readonly Broker[] }) {
  const [sort, setSort] = React.useState<SortKey>("tenure")
  const [desk, setDesk] = React.useState<DeskId | "all">("all")

  const shown = React.useMemo(() => {
    const filtered = desk === "all" ? [...brokers] : brokers.filter((b) => b.desk === desk)
    return filtered.sort((a, b) => compare(a, b, sort))
  }, [brokers, desk, sort])

  return (
    <Section id="roster" label="03" title="THE ROSTER">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Chip active={desk === "all"} onClick={() => setDesk("all")}>
          All
        </Chip>
        {DESKS.map((d) => (
          <Chip key={d.id} active={desk === d.id} onClick={() => setDesk(d.id)}>
            {d.label}
          </Chip>
        ))}

        <span className="ml-auto text-[0.65rem] tracking-widest text-ink-muted uppercase">
          Sort
        </span>
        {SORTS.map((s) => (
          <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>
            {s.label}
          </Chip>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="border border-ink/15 p-6 text-sm text-ink-muted">
          No brokers on this desk yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((b) => (
            <BrokerCard key={b.id} broker={b} />
          ))}
        </div>
      )}
    </Section>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- roster`
Expected: PASS, 8 tests.

- [ ] **Step 5: Wire `<Roster brokers={ROSTER} />` into `src/App.tsx`** after `<DeskBoard />`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add broker cards and sortable filterable roster"
```

---

### Task 14: Vault record, how-it-works, funding line, and final assembly

**Files:**
- Create: `src/lib/vault.ts`, `src/components/vault-record.tsx`, `src/components/how-it-works.tsx`, `src/components/funding-line.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/vault-record.test.tsx`, `src/components/funding-line.test.tsx`

**Interfaces:**
- Consumes: `recordsFor`, `vaultTotals`, `type Holding` from `@/lib/records`; `usePrices`; `usd`, `pct`, `EMPTY` from `@/lib/format`; `instrumentByMint`, `ALL_MINTS` from `@/lib/instruments`; `Section`, `Stat` from `@/components/primitives`
- Produces: `const VAULT_HOLDINGS: readonly Holding[]`, `const PLANCK_CA: string | null`, `<VaultRecord />`, `<HowItWorks />`, `<FundingLine />`

- [ ] **Step 1: Create the vault fixture**

`src/lib/vault.ts`:

```ts
/**
 * The vault's book.
 *
 * A Phase 1 fixture with an explicitly zero cost basis where nothing has
 * been bought yet — the firm has not deployed, and the site says so rather
 * than inventing a portfolio. Phase 2 replaces this with holdings read from
 * the vault address.
 */

import type { Holding } from "@/lib/records"

/** Null until the tokens.xyz launch. The funding line renders accordingly. */
export const PLANCK_CA: string | null = null

export const VAULT_HOLDINGS: readonly Holding[] = []
```

- [ ] **Step 2: Write the failing tests**

`src/components/vault-record.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { VaultRecord } from "@/components/vault-record"
import type { Holding } from "@/lib/records"

const NVDAX = "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg"

vi.mock("@/lib/jupiter-price", async (orig) => ({
  ...(await orig<typeof import("@/lib/jupiter-price")>()),
  fetchPrices: vi.fn(),
}))

const { fetchPrices } = await import("@/lib/jupiter-price")
const mockFetchPrices = vi.mocked(fetchPrices)

afterEach(() => vi.clearAllMocks())

const HOLDINGS: Holding[] = [{ mint: NVDAX, quantity: 10, costBasisUsd: 2000 }]

describe("VaultRecord", () => {
  it("says the book is empty rather than showing a fake portfolio", async () => {
    mockFetchPrices.mockResolvedValue({})
    render(<VaultRecord holdings={[]} />)
    expect(await screen.findByText(/has not deployed/i)).toBeInTheDocument()
  })

  it("renders a holding with its live value and gain", async () => {
    mockFetchPrices.mockResolvedValue({
      [NVDAX]: { mint: NVDAX, usdPrice: 250, priceChange24h: null, fetchedAt: Date.now() },
    })
    render(<VaultRecord holdings={HOLDINGS} />)
    expect(await screen.findByText("NVDAx")).toBeInTheDocument()
    expect(await screen.findByText("$2,500.00")).toBeInTheDocument()
    expect(await screen.findByText("+25.00%")).toBeInTheDocument()
  })

  it("renders an em dash for an unpriced holding instead of a zero", async () => {
    mockFetchPrices.mockResolvedValue({})
    render(<VaultRecord holdings={HOLDINGS} />)
    expect(await screen.findByText("NVDAx")).toBeInTheDocument()
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument()
  })
})
```

`src/components/funding-line.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FundingLine } from "@/components/funding-line"

describe("FundingLine", () => {
  it("states the CA when there is one", () => {
    render(<FundingLine ca="A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6" />)
    expect(screen.getByText(/A1KLoBrK/)).toBeInTheDocument()
  })

  it("says the token is not live yet when there is no CA", () => {
    render(<FundingLine ca={null} />)
    expect(screen.getByText(/not live/i)).toBeInTheDocument()
  })

  it("shows no price, chart or ticker", () => {
    const { container } = render(<FundingLine ca="A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6" />)
    expect(container.textContent).not.toMatch(/\$\d/)
    expect(container.querySelector("svg")).toBeNull()
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- vault-record funding-line`
Expected: FAIL — modules not found.

- [ ] **Step 4: Write the implementations**

`src/components/vault-record.tsx`:

```tsx
import { Section, Stat } from "@/components/primitives"
import { usePrices } from "@/hooks/use-prices"
import { EMPTY, pct, usd } from "@/lib/format"
import { ALL_MINTS, instrumentByMint } from "@/lib/instruments"
import { recordsFor, vaultTotals, type Holding } from "@/lib/records"
import { cn } from "@/lib/utils"

export function VaultRecord({ holdings }: { holdings: readonly Holding[] }) {
  const { prices } = usePrices(ALL_MINTS)
  const records = recordsFor(holdings, prices)
  const totals = vaultTotals(holdings, prices)

  return (
    <Section id="record" label="04" title="THE RECORD">
      {holdings.length === 0 ? (
        <p className="border border-ink/15 bg-paper p-6 text-sm leading-relaxed text-ink-muted">
          The vault has not deployed yet. Nothing has been bought, so there is
          nothing to show. Holdings appear here — with cost basis and live value —
          the moment the first broker is hired.
        </p>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            <Stat label="Cost basis" value={usd(totals.costUsd)} />
            <Stat label="Market value" value={usd(totals.valueUsd)} />
            <Stat
              label="Unrealised"
              value={usd(totals.pnlUsd)}
              tone={
                totals.pnlUsd === null ? "neutral" : totals.pnlUsd >= 0 ? "gain" : "loss"
              }
            />
            <Stat
              label="Return"
              value={pct(totals.pnlPct)}
              hint={`${totals.priced} of ${totals.total} priced`}
            />
          </div>

          <div className="overflow-x-auto border border-ink/15 bg-paper">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-ink/15 text-left text-[0.65rem] tracking-widest text-ink-muted uppercase">
                  <th className="p-3 font-normal">Instrument</th>
                  <th className="p-3 text-right font-normal">Quantity</th>
                  <th className="p-3 text-right font-normal">Cost</th>
                  <th className="p-3 text-right font-normal">Value</th>
                  <th className="p-3 text-right font-normal">Return</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.mint} className="border-b border-ink/10 last:border-0">
                    <td className="num p-3">
                      {instrumentByMint(r.mint)?.symbol ?? EMPTY}
                    </td>
                    <td className="num p-3 text-right">{r.quantity}</td>
                    <td className="num p-3 text-right">{usd(r.costBasisUsd)}</td>
                    <td className="num p-3 text-right">{usd(r.marketValueUsd)}</td>
                    <td
                      className={cn(
                        "num p-3 text-right",
                        r.pnlPct === null && "text-ink-muted",
                        r.pnlPct !== null && r.pnlPct >= 0 && "text-gain",
                        r.pnlPct !== null && r.pnlPct < 0 && "text-loss"
                      )}
                    >
                      {pct(r.pnlPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  )
}
```

`src/components/how-it-works.tsx`:

```tsx
import { Section } from "@/components/primitives"

const STEPS = [
  {
    n: "01",
    title: "Mint a broker",
    body: "Traits roll on mint: a desk, plus nerve, latency and coverage. Every one drives a mechanic. Surplus coverage on a small desk converts to nerve, so no roll is wasted.",
  },
  {
    n: "02",
    title: "He takes a desk",
    body: "The desk decides which real instruments he can touch — tokenized equity, index, bullion, treasuries or private credit. All of it settles on Solana.",
  },
  {
    n: "03",
    title: "Someone hires him",
    body: "A hiring fee in $PLANCK engages him for a term. The fee splits between the broker's owner, the house vault, and a burn.",
  },
  {
    n: "04",
    title: "The vault buys",
    body: "The vault's allocation goes into his desk's instruments and the cost basis is stamped on chain. The vault holds what it buys. It does not sell.",
  },
  {
    n: "05",
    title: "The record stands",
    body: "His track record is live price against recorded basis — arithmetic on public data, not a claim we make. It follows him permanently.",
  },
]

export function HowItWorks() {
  return (
    <Section id="how" label="05" title="HOW IT WORKS">
      <ol className="grid gap-px border border-ink/15 bg-ink/15 md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="bg-paper p-5">
            <span className="num text-xs text-cobalt">{s.n}</span>
            <h3 className="mt-2 font-display text-base">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
```

`src/components/funding-line.tsx`:

```tsx
/**
 * The token, kept deliberately quiet.
 *
 * One line and a contract address. No price, no chart, no ticker — the site
 * argues for the mechanism, and a price widget would make it argue for the
 * trade instead.
 */
export function FundingLine({ ca }: { ca: string | null }) {
  return (
    <div className="border-t border-ink/15 py-8">
      <p className="text-sm text-ink-muted">
        The firm is funded by creator fees on $PLANCK. Fees buy real assets the
        vault never sells.
      </p>
      {ca ? (
        <p className="num mt-2 text-xs break-all text-ink">{ca}</p>
      ) : (
        <p className="mt-2 text-xs text-ink-muted">Token not live yet.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- vault-record funding-line`
Expected: PASS, 6 tests.

- [ ] **Step 6: Assemble the final page**

`src/App.tsx`:

```tsx
import * as React from "react"

import { DeskBoard } from "@/components/desk-board"
import { DisclaimerGate, hasAcceptedGate } from "@/components/disclaimer-gate"
import { FloorCensus } from "@/components/floor-census"
import { FundingLine } from "@/components/funding-line"
import { Hero } from "@/components/hero"
import { HowItWorks } from "@/components/how-it-works"
import { Roster } from "@/components/roster"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { VaultRecord } from "@/components/vault-record"
import { ROSTER } from "@/lib/brokers"
import { PLANCK_CA, VAULT_HOLDINGS } from "@/lib/vault"

export function App() {
  const [entered, setEntered] = React.useState(hasAcceptedGate)

  return (
    <div id="top">
      {!entered && <DisclaimerGate onAccept={() => setEntered(true)} />}
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4">
        <Hero />
        <FloorCensus brokers={ROSTER} />
        <DeskBoard brokers={ROSTER} holdings={VAULT_HOLDINGS} />
        <Roster brokers={ROSTER} />
        <VaultRecord holdings={VAULT_HOLDINGS} />
        <HowItWorks />
        <FundingLine ca={PLANCK_CA} />
      </main>
      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 7: Full verification**

Run: `npm test` — expected: all suites PASS.
Run: `npm run typecheck` — expected: no errors.
Run: `npm run build` — expected: clean build.

Then start the dev server with the preview tool and check, in order:

1. The disclaimer gate blocks entry until the box is ticked.
2. All five desks show live prices; nothing renders `$0`.
3. The roster filters and sorts; sprites differ across desks.
4. The record section states the vault has not deployed.
5. The funding line shows no price, chart, or ticker.
6. Console is free of `[PLANCKBITS]` warnings and React errors.
7. At the mobile preset the page does not scroll horizontally.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add vault record, how-it-works, funding line and assemble the page"
```

---

## Self-review notes

**Spec coverage.** §3 instruments → Task 2. §4 broker traits and the coverage rule → Task 6. §5 hiring → pre-launch buttons in Tasks 8/13; the mechanic itself is Phase 2. §6 palette, type, pixel art → Tasks 1, 8, 12. §7 all eleven page sections → Tasks 8–14. §8 module boundaries → Tasks 2–7; error handling → Tasks 3, 4, 11, 14; testing → every task.

**Fixed during self-review.**

1. *Spec gap.* §7 requires each desk card to show vault holdings per desk and brokers assigned; the first draft of Task 11 showed prices only. `DeskBoard` now takes `brokers` and `holdings` and renders both, with two added tests. This also gave `deskTotals` its consumer — it was otherwise dead code.
2. *YAGNI.* Dropped `compactUsd` and `shortAddress` from Task 5 and `Rule` from Task 8. Nothing consumed them.
3. *Interface drift.* Task 7's Consumes block listed `INSTRUMENTS`/`instrumentsForDesk`; the implementation imports `instrumentByMint`. Corrected, as was Task 14's.
4. *Ordering.* Task 11 wires `holdings={[]}` because `VAULT_HOLDINGS` does not exist until Task 14, which then swaps it in. Tasks are implementable strictly in order.

**Deliberate deviation from the spec.** §8 proposed nested directories (`lib/prices/`, `components/desks/`). This plan uses flat kebab-case files instead, matching the convention actually in use in `new_projects/airock`. The module boundaries are unchanged — only the paths differ.

**One spec open item closed, one landed inside a task.** The spec's Pixelta licence risk is gone: the font is now Departure Mono, MIT licensed, fetched from its official repo. It also widened in scope — it carries headings *and* all numeric data, so Geist Mono is dropped and the page reads as one dot-matrix system. The `$PLANCK` CA is typed `string | null` in Task 14 so its absence is a rendered state rather than a placeholder.

**Still open, and not resolvable in code:** the 60/30/10 fee split. It is not referenced by any Phase 1 task — no displayed number depends on it — so Phase 1 is unblocked, but Phase 2 cannot start without a decision.
