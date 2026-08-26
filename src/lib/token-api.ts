/**
 * The site's own API, served by server/index.mjs.
 *
 * Everything here is same-origin. The Birdeye key and the Supabase service
 * role key live on the server and never reach this bundle.
 *
 * Note what is absent: there is no price call. The server does not expose one
 * and this module could not make one. The site argues for the mechanism, and
 * a price widget would make it argue for the trade instead.
 */

export type TokenStats = {
  mint: string
  holders: number | null
  supply: number | null
  symbol: string | null
}

export type Holding = {
  wallet: string
  mint: string
  holds: boolean
  amount: number
}

/**
 * Why a token call could not be answered.
 *
 * "not_launched" is a state, not a failure — the token does not exist yet and
 * the UI says so plainly rather than showing an error.
 */
export type ApiFailure = "not_launched" | "unavailable"

export type ApiResult<T> = { ok: true; data: T } | { ok: false; reason: ApiFailure }

async function get<T>(path: string, signal?: AbortSignal): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, { signal, headers: { accept: "application/json" } })

    // 503 means the server is healthy but unconfigured, which is a state
    // rather than a fault. Distinguish the two causes: a missing mint means
    // the token does not exist yet and the UI should say so plainly; a
    // missing Birdeye key is our own gap and reads as temporarily unavailable.
    if (res.status === 503) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      return {
        ok: false,
        reason: body.error === "token_not_launched" ? "not_launched" : "unavailable",
      }
    }

    if (!res.ok) return { ok: false, reason: "unavailable" }

    return { ok: true, data: (await res.json()) as T }
  } catch (e) {
    if ((e as Error).name !== "AbortError") {
      console.warn(`[PLANCKBITS] ${path} failed:`, e)
    }
    return { ok: false, reason: "unavailable" }
  }
}

export function fetchTokenStats(signal?: AbortSignal): Promise<ApiResult<TokenStats>> {
  return get<TokenStats>("/api/token", signal)
}

export function fetchHolding(
  wallet: string,
  signal?: AbortSignal
): Promise<ApiResult<Holding>> {
  return get<Holding>(`/api/holding?wallet=${encodeURIComponent(wallet)}`, signal)
}

export type MintedBroker = {
  id: string
  name: string
  desk: string
  nerve: number
  latency: number
  coverage: number
  effective_nerve: number
  tenure_hours: number
}

/** Why a mint was refused. Each maps to a different thing to tell the visitor. */
export type MintError =
  | "not_holding"
  | "mint_cap_reached"
  | "not_launched"
  | "unavailable"

export type MintResult =
  | { ok: true; broker: MintedBroker }
  | { ok: false; reason: MintError; cap?: number }

/**
 * Mint a broker.
 *
 * The server rolls the traits and re-checks the holding itself — nothing here
 * is trusted, and nothing here needs to be.
 */
export async function mintBroker(wallet: string): Promise<MintResult> {
  try {
    const res = await fetch("/api/mint", {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ wallet }),
    })

    if (res.ok) return { ok: true, broker: (await res.json()) as MintedBroker }

    const body = (await res.json().catch(() => ({}))) as { error?: string; cap?: number }

    if (body.error === "not_holding") return { ok: false, reason: "not_holding" }
    if (body.error === "mint_cap_reached") {
      return { ok: false, reason: "mint_cap_reached", cap: body.cap }
    }
    if (body.error === "token_not_launched") return { ok: false, reason: "not_launched" }

    return { ok: false, reason: "unavailable" }
  } catch (e) {
    console.warn("[PLANCKBITS] mint request failed:", e)
    return { ok: false, reason: "unavailable" }
  }
}
