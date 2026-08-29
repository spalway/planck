# Seeing the program work

Two scripts. `program/client.mjs` drives the whole loop; `program/recover.mjs`
is the check anyone else can run against us.

Both take `--devnet`, `--rpc=<url>`, or default to a local validator. Programs
cannot build on native Windows, so the wallet lives in WSL while node_modules
lives on the Windows side — hence `--keypair=`.

## The loop

First a validator and the program on it, from WSL. `setsid` matters: started
any other way it dies the moment the `wsl` bridge command returns.

```bash
setsid nohup solana-test-validator --reset --quiet --ledger ~/test-ledger > ~/validator.log 2>&1 < /dev/null &
```

```bash
cd ~/dev/planckbits && solana airdrop 10 --url http://127.0.0.1:8899 && solana program deploy target/deploy/planckbits.so --program-id target/deploy/planckbits-keypair.json --url http://127.0.0.1:8899
```

Then, from the project root on the Windows side:

```bash
npm run chain:local -- --keypair='//wsl$/Ubuntu/home/skizp/.config/solana/id.json'
```

Stop it afterwards with `pkill -f solana-test-validator`.

It mints a broker from a fresh wallet, reads back the traits **the chain
rolled**, renders the portrait from those traits, puts it in an SPL Memo,
calls `inscribe`, and then checks the hash the program stored against
`sha256` of the memo it actually sent.

The order matters and it is the one thing that took two attempts to get
right: the client cannot draw the portrait inside the mint transaction,
because at that point nobody knows what was rolled yet. Mint and inscribe
are two transactions.

Measured on a local validator: portrait 344 base64 characters, inscribe
transaction 624 bytes against the 1232-byte limit.

## The independent check

```bash
node program/recover.mjs <inscribe-signature> broker.png --devnet
```

This imports no roster, no palette, no sprite composer. It pulls the
transaction by signature, finds the memo, base64-decodes it and writes a PNG.
If that produces a chimp, the image really is in the transaction — and the
same base64 pasted into any decoder (base64.guru and friends) shows the same
thing.

## What this does and does not prove

The program stores `sha256` of the bytes it was shown. It cannot check that
those bytes decode to a PNG, or that the PNG matches the traits it rolled —
that would mean rendering a sprite on chain.

So a faked portrait is **publicly detectable, not prevented**: anyone can
re-render from the stored traits and compare. Say it that way on the site.

## Devnet

Not deployed there yet. It needs SOL, and the deploy cost depends entirely on
one flag:

| | programdata | rent |
|---|---|---|
| `solana program deploy` (default 2x upgrade headroom) | 478,285 B | **3.330 SOL** |
| `--max-len 239120` (no headroom) | 239,165 B | **1.665 SOL** |

The default doubles the program length so it can be upgraded to something
bigger later. For a devnet demo that headroom is worth nothing and it is the
difference between needing two funded airdrops and needing one.

The CLI faucet has refused this wallet on every attempt across two days
(`solana airdrop 2` → rate limited, nine tries). Use the web faucet instead —
it authenticates and has a separate, much higher allowance:

> <https://faucet.solana.com> — paste `AbR3pATkfatjuzhjAUPiJRGbemx4VXR9n78MkkL1Y2Lf`, pick devnet, request 2 SOL.

Then, from WSL:

```bash
cd ~/dev/planckbits && solana program deploy target/deploy/planckbits.so \
  --program-id target/deploy/planckbits-keypair.json \
  --max-len 239120 --url devnet
```

and from the project root:

```bash
npm run chain:devnet -- --keypair='//wsl$/Ubuntu/home/skizp/.config/solana/id.json'
```

which prints explorer.solana.com links for the mint and the inscribe.
