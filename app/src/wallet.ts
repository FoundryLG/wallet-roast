// Read-only wallet fetch via @solana/kit. No signer, no wallet connection.
import { address, createSolanaRpc, isAddress, type Address } from "@solana/kit";
import { enrich } from "./jupiter";
import { SIGNATURE_LIMIT, type TokenHolding, type WalletData } from "./roast";

const TOKEN_PROGRAM = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM = address("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

// Deployed site: go through the /api/rpc proxy (the public RPC 403s browsers).
// Local dev: VITE_RPC_URL if set, otherwise the public RPC (works from localhost).
const RPC_URL: string =
  import.meta.env.VITE_RPC_URL ??
  (import.meta.env.PROD ? `${location.origin}/api/rpc` : "https://api.mainnet-beta.solana.com");

const rpc = createSolanaRpc(RPC_URL);

export function parseAddress(input: string): Address | null {
  const trimmed = input.trim();
  return isAddress(trimmed) ? trimmed : null;
}

interface ParsedTokenAccount {
  account: {
    data: {
      parsed?: { info?: { mint?: string; tokenAmount?: { amount?: string } } };
    };
  };
}

async function tokenAccounts(owner: Address, programId: Address): Promise<TokenHolding[]> {
  const res = await rpc
    .getTokenAccountsByOwner(owner, { programId }, { encoding: "jsonParsed" })
    .send();
  const out: TokenHolding[] = [];
  for (const item of res.value as unknown as ParsedTokenAccount[]) {
    const info = item.account.data.parsed?.info;
    if (!info?.mint || info.tokenAmount?.amount === undefined) continue;
    out.push({ mint: info.mint, amount: BigInt(info.tokenAmount.amount) });
  }
  return out;
}

/** Fetch balance, token accounts (Token + Token-2022) and recent activity in parallel. */
export async function fetchWallet(owner: Address): Promise<WalletData> {
  const [balance, legacy, token2022, sigs] = await Promise.all([
    rpc.getBalance(owner).send(),
    tokenAccounts(owner, TOKEN_PROGRAM),
    tokenAccounts(owner, TOKEN_2022_PROGRAM),
    rpc.getSignaturesForAddress(owner, { limit: SIGNATURE_LIMIT }).send(),
  ]);
  return {
    lamports: balance.value,
    tokens: await enrich([...legacy, ...token2022]),
    signatureCount: sigs.length,
  };
}
