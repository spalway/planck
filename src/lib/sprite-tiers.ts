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
  /**
   * Non-natural fur. Swaps the garment, hat and outline set to the cool,
   * near-black one so cyan and chrome sit on something that belongs with
   * them. It used to mean "dark ground" too, back when there was a ground.
   */
  dark: boolean
  muzzle: string
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
    furs: [
      // Chrome was #e8f4f8 back when it sat on a black ground. On the site's
      // paper it was the same value as the page and the face collapsed into
      // an outline, so it is a darker polished steel now — still chrome, but
      // it holds its own structure against a light surface.
      ["#bcd4e2", "#7d97a8"],
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
