/**
 * Supabase writes, under the service role.
 *
 * The service role bypasses row-level security, so this key must never leave
 * the server. The client's anon key has select policies and nothing else,
 * which is what stops a visitor inserting their own engagement and handing
 * themselves a track record.
 */

const URL_BASE = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ""
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

export function supabaseConfigured() {
  return Boolean(URL_BASE && SERVICE_KEY)
}

function headers(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  }
}

/** Postgres unique-violation. The caller decides whether that is fatal. */
export const UNIQUE_VIOLATION = "23505"

export async function insertRow(table, row) {
  const res = await fetch(`${URL_BASE}/rest/v1/${table}`, {
    method: "POST",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(row),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(`supabase insert ${res.status}`), {
      status: res.status,
      code: body?.code,
    })
  }

  const rows = await res.json()
  return Array.isArray(rows) ? rows[0] : rows
}

export async function selectRows(table, query) {
  const res = await fetch(`${URL_BASE}/rest/v1/${table}?${query}`, {
    headers: headers(),
  })

  if (!res.ok) {
    throw Object.assign(new Error(`supabase select ${res.status}`), { status: res.status })
  }

  return res.json()
}

/** Rows a wallet already owns — used to cap how many brokers one wallet mints. */
export async function countBrokersOwnedBy(wallet) {
  const rows = await selectRows(
    "brokers",
    `select=id&owner_wallet=eq.${encodeURIComponent(wallet)}`
  )
  return Array.isArray(rows) ? rows.length : 0
}
