import type { Wallet, WalletAccount } from "@wallet-standard/base"
import { describe, expect, it, vi } from "vitest"

import {
  asRegistryUnsubscribe,
  connectWallet,
  disconnectWallet,
  isSolanaWallet,
  onWalletChange,
  solanaAccount,
  solanaWallets,
} from "@/lib/solana-wallets"

const ADDRESS = "7pt9tkctJPK7PPNQJ77GKg8ZffSF6QxoMiCFYHxrtaCj"

function account(chains: string[] = ["solana:mainnet"]): WalletAccount {
  return {
    address: ADDRESS,
    publicKey: new Uint8Array(),
    chains,
    features: [],
  } as unknown as WalletAccount
}

function fakeWallet(
  overrides: Record<string, unknown> = {},
  opts: { name?: string; chains?: string[] } = {}
): Wallet {
  return {
    name: opts.name ?? "Phantom",
    icon: "data:image/svg+xml;base64,x",
    version: "1.0.0",
    chains: opts.chains ?? ["solana:mainnet"],
    accounts: [],
    features: {
      "standard:connect": { connect: async () => ({ accounts: [account()] }) },
      "standard:disconnect": { disconnect: async () => {} },
      "standard:events": { on: () => () => {} },
      ...overrides,
    },
  } as unknown as Wallet
}

function stripFeature(w: Wallet, name: string): Wallet {
  delete (w.features as Record<string, unknown>)[name]
  return w
}

describe("isSolanaWallet", () => {
  it("accepts a solana wallet that can connect", () => {
    expect(isSolanaWallet(fakeWallet())).toBe(true)
  })

  it("rejects a wallet on another chain", () => {
    expect(isSolanaWallet(fakeWallet({}, { chains: ["ethereum:1"] }))).toBe(false)
  })

  it("rejects a wallet with no connect feature", () => {
    expect(isSolanaWallet(stripFeature(fakeWallet(), "standard:connect"))).toBe(false)
  })
})

describe("solanaWallets", () => {
  it("filters out non-solana wallets", () => {
    const list = [
      fakeWallet(),
      fakeWallet({}, { name: "Rainbow", chains: ["ethereum:1"] }),
    ]
    expect(solanaWallets(list).map((w) => w.name)).toEqual(["Phantom"])
  })

  it("dedupes a wallet registering twice under one name", () => {
    // Extensions sometimes register on both document load and injection.
    expect(solanaWallets([fakeWallet(), fakeWallet()])).toHaveLength(1)
  })

  it("returns an empty list when nothing is installed", () => {
    expect(solanaWallets([])).toEqual([])
  })
})

describe("solanaAccount", () => {
  it("picks the solana account", () => {
    expect(solanaAccount([account(["ethereum:1"]), account()])?.address).toBe(ADDRESS)
  })

  it("returns null when none match", () => {
    expect(solanaAccount([account(["ethereum:1"])])).toBeNull()
  })
})

describe("connectWallet", () => {
  it("returns the connected address", async () => {
    expect(await connectWallet(fakeWallet())).toBe(ADDRESS)
  })

  it("returns null when the user dismisses the prompt", async () => {
    const w = fakeWallet({
      "standard:connect": {
        connect: async () => {
          throw new Error("User rejected the request")
        },
      },
    })
    // A cancelled connect is an ordinary outcome and must not throw.
    expect(await connectWallet(w)).toBeNull()
  })

  it("returns null when the wallet exposes no solana account", async () => {
    const w = fakeWallet({
      "standard:connect": {
        connect: async () => ({ accounts: [account(["ethereum:1"])] }),
      },
    })
    expect(await connectWallet(w)).toBeNull()
  })
})

describe("disconnectWallet", () => {
  it("calls through when supported", async () => {
    const disconnect = vi.fn().mockResolvedValue(undefined)
    await disconnectWallet(fakeWallet({ "standard:disconnect": { disconnect } }))
    expect(disconnect).toHaveBeenCalled()
  })

  it("is a no-op when the wallet cannot disconnect", async () => {
    const w = stripFeature(fakeWallet(), "standard:disconnect")
    await expect(disconnectWallet(w)).resolves.toBeUndefined()
  })

  it("swallows a throwing disconnect", async () => {
    const w = fakeWallet({
      "standard:disconnect": {
        disconnect: async () => {
          throw new Error("nope")
        },
      },
    })
    await expect(disconnectWallet(w)).resolves.toBeUndefined()
  })
})

describe("onWalletChange", () => {
  it("subscribes and returns the unsubscribe", () => {
    const off = vi.fn()
    const w = fakeWallet({ "standard:events": { on: () => off } })
    // Behaviour, not identity: the returned cleanup wraps the wallet's own
    // so a throwing unsubscribe cannot take the page down with it.
    onWalletChange(w, () => {})()
    expect(off).toHaveBeenCalledTimes(1)
  })

  it("returns a safe no-op when events are unsupported", () => {
    const w = stripFeature(fakeWallet(), "standard:events")
    expect(() => onWalletChange(w, () => {})()).not.toThrow()
  })
})

/**
 * A wallet extension is untrusted code that we did not ship.
 *
 * The Wallet Standard types promise `on()` returns an unsubscribe function.
 * An extension is free to break that promise, and one did: the raw value was
 * handed to React as an effect cleanup, so a non-function made React throw
 * "is not a function" during the commit phase and tear down the whole tree.
 * Every client-side navigation unmounts something, so the site went blank on
 * every nav until a reload.
 */
describe("onWalletChange survives a badly behaved wallet", () => {
  function walletReturning(value: unknown): Wallet {
    return {
      name: "Rogue",
      version: "1.0.0",
      icon: "data:,",
      chains: ["solana:mainnet"],
      accounts: [],
      features: {
        "standard:events": { on: () => value },
      },
    } as unknown as Wallet
  }

  for (const [label, value] of [
    ["undefined", undefined],
    ["null", null],
    ["an object", { unsubscribe: () => {} }],
    ["a string", "ok"],
    ["a number", 1],
  ] as const) {
    it(`returns a callable cleanup when on() returns ${label}`, () => {
      const off = onWalletChange(walletReturning(value), () => {})
      expect(typeof off).toBe("function")
      // The crash was React calling this. It must never throw.
      expect(() => off()).not.toThrow()
    })
  }

  it("still uses a real unsubscribe when the wallet provides one", () => {
    const unsub = vi.fn()
    const off = onWalletChange(walletReturning(unsub), () => {})
    off()
    expect(unsub).toHaveBeenCalledTimes(1)
  })

  it("swallows an unsubscribe that throws", () => {
    // A cleanup that throws does the same damage as one that is missing.
    const off = onWalletChange(
      walletReturning(() => {
        throw new Error("wallet exploded")
      }),
      () => {}
    )
    expect(() => off()).not.toThrow()
  })

  it("guards the registry unsubscribe the same way", () => {
    expect(() => asRegistryUnsubscribe(undefined)()).not.toThrow()
    expect(() => asRegistryUnsubscribe({})()).not.toThrow()

    const real = vi.fn()
    asRegistryUnsubscribe(real)()
    expect(real).toHaveBeenCalledTimes(1)
  })
})
