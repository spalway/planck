/**
 * Scarcity tiers.
 *
 * Fur is the signal. Naturals at the common end, colours no chimp has at the
 * rare end — that is the whole read, and it works at thumbnail size where a
 * stat bar does not.
 *
 * Tier is COSMETIC. It is rolled and stored so it is verifiable rather than
 * authored, but nothing may make it affect nerve, latency, coverage or
 * effective nerve. The site copy must not imply otherwise.
 */

export type TierId = "common" | "uncommon" | "rare" | "epic" | "legendary"

export type Tier = {
  id: TierId
  label: string
  /** Probability in 0..1. The table must sum to exactly 1. */
  odds: number
  /** Dark ground and outline, so non-natural fur does not wash out. */
  dark: boolean
  muzzle: string
  grounds: readonly string[]
  /** [fur, shadow] pairs. */
  furs: readonly (readonly [string, string])[]
}

export const TIERS: readonly Tier[] = [
  {
    id: "common",
    label: "COMMON",
    odds: 0.62,
    dark: false,
    muzzle: "#d9bb95",
    grounds: ["#c9d9c4", "#dfd6c2", "#d6ccc0"],
    furs: [
      ["#7a5537", "#4a3728"],
      ["#6b4a2a", "#42301c"],
      ["#8c6239", "#5c4330"],
    ],
  },
  {
    id: "uncommon",
    label: "UNCOMMON",
    odds: 0.25,
    dark: false,
    muzzle: "#cfb99b",
    grounds: ["#f0d9c0", "#e8dcc4", "#dde6c4"],
    furs: [
      ["#2f2a26", "#1a1714"],
      ["#b09070", "#836a52"],
      ["#6e6a63", "#494540"],
    ],
  },
  {
    id: "rare",
    label: "RARE",
    odds: 0.09,
    dark: false,
    muzzle: "#c9c0b4",
    grounds: ["#e8c9d6", "#cfc6e8", "#c6dbe8"],
    furs: [
      ["#5c6b7a", "#3a4652"],
      ["#6b7a5c", "#455239"],
      ["#7a5c6b", "#523a46"],
    ],
  },
  {
    id: "epic",
    label: "EPIC",
    odds: 0.035,
    dark: true,
    muzzle: "#eaf6f8",
    grounds: ["#101418", "#18101c", "#0e1a18"],
    furs: [
      ["#17c3d4", "#0d7d88"],
      ["#d417a8", "#8a0d6c"],
      ["#7fd417", "#4d8a0d"],
    ],
  },
  {
    id: "legendary",
    label: "LEGENDARY",
    odds: 0.005,
    dark: true,
    muzzle: "#ffffff",
    grounds: ["#000000", "#0a0a12", "#120a00"],
    furs: [
      ["#e8f4f8", "#9db4c0"],
      ["#c8a2ff", "#7a5cb0"],
      ["#ffd700", "#b08d00"],
    ],
  },
]

const BY_ID = new Map(TIERS.map((t) => [t.id, t]))

export function tierById(id: TierId): Tier {
  const t = BY_ID.get(id)
  if (!t) throw new Error(`unknown tier: ${id}`)
  return t
}

/**
 * Roll a tier. Walks the table accumulating odds, so the distribution is
 * exactly the declared one and the last tier absorbs any float residue.
 */
export function rollTier(rand: () => number): TierId {
  let n = rand()
  for (const t of TIERS) {
    n -= t.odds
    if (n < 0) return t.id
  }
  return TIERS[TIERS.length - 1].id
}
