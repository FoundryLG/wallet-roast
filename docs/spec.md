# Wallet Roast

A web page that reads any public Solana wallet and writes a funny one-line roast.

## Goal

- Ship a working version in 20 minutes.
- Keep it read-only. No private keys. No wallet connection. No signatures.
- Make the result easy to share as a card or screenshot.

## User Flow

1. The user pastes a wallet address.
2. The page checks that the address is valid.
3. The page reads the wallet data from Solana.
4. The page writes a roast from the data.
5. The page shows the roast on a shareable card.

## Tech Stack

- One HTML file with plain JavaScript.
- `@solana/web3.js` for RPC calls.
- A free RPC key from Helius, QuickNode, or Alchemy.
- Jupiter token list (or a DAS API) for token names.
- Optional: Jupiter price API for dollar values.
- Optional: an LLM API for funnier roasts.

## Solana Calls

| Call | What it returns | Use |
| --- | --- | --- |
| `getBalance` | SOL balance in lamports | Divide by 1e9 for SOL |
| `getParsedTokenAccountsByOwner` | All token accounts | Count tokens, find mints |
| `getSignaturesForAddress` | Recent transactions | Count activity |

## Core Code

```js
import { Connection, PublicKey } from "@solana/web3.js";

const conn = new Connection("https://YOUR_RPC_URL_HERE");
const owner = new PublicKey(address);

const sol = (await conn.getBalance(owner)) / 1e9;

const tokens = await conn.getParsedTokenAccountsByOwner(owner, {
  programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
});

const sigs = await conn.getSignaturesForAddress(owner, { limit: 100 });
```

## Roast Rules (Version 1)

Use simple rules first. Add an LLM later.

- Zero transactions: "Fresh wallet. Smells new."
- Under 0.01 SOL: "You hold less SOL than a gas station snack costs."
- More than 10 tokens worth under $1: "Collector of dust."
- More than 50 tokens: "This is not a wallet. This is a yard sale."
- Holds a dog or frog coin: "Bold. The memes believe in you."
- Many empty token accounts: "Your wallet has more clutter than your garage."
- More than 100 recent transactions: "You trade a lot. Your fees thank you."
- Default: "Clean wallet. Suspiciously clean."

## Things to Know

- The free public RPC has strict rate limits. Use your own key.
- Use mainnet. Devnet wallets are empty.
- Some tokens use the Token-2022 program. Query both program IDs for full coverage.
- Balances show no dollar values. Add the Jupiter price API if you want them.
- Say on the page that you only read public data.

## 20-Minute Plan

| Minutes | Task |
| --- | --- |
| 0 to 5 | Create the HTML file. Get the RPC key. |
| 5 to 12 | Fetch balance, tokens, and transactions. |
| 12 to 17 | Write 8 to 10 roast rules. |
| 17 to 20 | Add styling and a share button. |

## Later Upgrades

- LLM roasts that use the full token list.
- Dollar values for each token.
- A "roast battle" mode that compares two wallets.
- Download the card as an image.
- A leaderboard of the most roasted wallets.

## Done When

- A valid address gives a roast in under 5 seconds.
- A bad address shows a clear error message.
- The card looks good on a phone.
