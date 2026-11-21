# Wallet Roast

Paste any public Solana wallet and get a one-line roast on a shareable card. Read-only: no wallet connection, no keys, no signatures.

## Status (MVP)

- **Working:** the web app in `app/`: reads SOL balance, token accounts (Token and Token-2022) and recent activity through `@solana/kit`, adds token names and USD prices from Jupiter, and applies 10 roast rules. Download the card as an image or copy the roast.
- **Designed, not built:** on-chain roast rounds with a pooled-SOL prize. See [docs/rounds-design.md](docs/rounds-design.md). No program has been written or deployed, and nothing here holds funds.

## Run it

```bash
cd app
pnpm install
cp .env.example .env.local   # set VITE_RPC_URL to your own RPC key
pnpm dev
pnpm test
```

Needs Node 20.18+ and pnpm. The public mainnet RPC is rate limited; use your own key.

The original idea is in [docs/spec.md](docs/spec.md).
