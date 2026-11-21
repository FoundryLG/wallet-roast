// Pure roast logic. No network, no DOM: everything the rules need is in WalletData.
// rule ids are stable: they are the `rule_id` (u8) the on-chain program will accept.

export interface TokenHolding {
  mint: string;
  /** Raw token amount in base units. Never a JS number. */
  amount: bigint;
  /** Optional, filled in from a token list. */
  symbol?: string;
  /** Optional, filled in from a price API. Undefined means "unknown", not zero. */
  usdValue?: number;
}

export interface WalletData {
  lamports: bigint;
  /** Every token account found, in both the Token and Token-2022 programs. */
  tokens: TokenHolding[];
  /** Count of signatures returned by getSignaturesForAddress (capped by the fetch limit). */
  signatureCount: number;
}

export interface Roast {
  ruleId: number;
  text: string;
}

export const LAMPORTS_PER_SOL = 1_000_000_000n;
export const SIGNATURE_LIMIT = 100;

const LOW_SOL = LAMPORTS_PER_SOL / 100n; // 0.01 SOL
const WHALE_SOL = 100n * LAMPORTS_PER_SOL;
const DUST_USD = 1;
const DUST_MIN_TOKENS = 10;
const YARD_SALE_TOKENS = 50;
const EMPTY_ACCOUNTS_MIN = 10;

const MEME_SYMBOLS = new Set([
  "BONK", "WIF", "POPCAT", "PEPE", "DOGE", "SHIB", "FLOKI", "MYRO", "MEW", "BOME",
]);

// Best-effort mint list for when no symbol is available. Verify before relying on it.
const MEME_MINTS = new Set([
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", // WIF
  "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", // POPCAT
]);

interface Rule {
  id: number;
  text: string;
  matches: (w: WalletData) => boolean;
}

const held = (w: WalletData) => w.tokens.filter((t) => t.amount > 0n);
const emptyCount = (w: WalletData) => w.tokens.length - held(w).length;
const isMeme = (t: TokenHolding) =>
  (t.symbol !== undefined && MEME_SYMBOLS.has(t.symbol.toUpperCase())) || MEME_MINTS.has(t.mint);

// Order is priority: the first match wins. Default is last and always matches.
export const RULES: readonly Rule[] = [
  { id: 0, text: "Fresh wallet. Smells new.", matches: (w) => w.signatureCount === 0 },
  {
    id: 1,
    text: "You hold less SOL than a gas station snack costs.",
    matches: (w) => w.lamports < LOW_SOL,
  },
  {
    id: 2,
    text: "This is not a wallet. This is a yard sale.",
    matches: (w) => held(w).length > YARD_SALE_TOKENS,
  },
  {
    id: 3,
    text: "Your wallet has more clutter than your garage.",
    matches: (w) => emptyCount(w) >= EMPTY_ACCOUNTS_MIN,
  },
  {
    id: 4,
    text: "Collector of dust.",
    // Only counts tokens with a known price below $1. Unknown prices are not dust.
    matches: (w) =>
      held(w).filter((t) => t.usdValue !== undefined && t.usdValue < DUST_USD).length >
      DUST_MIN_TOKENS,
  },
  {
    id: 5,
    text: "Bold. The memes believe in you.",
    matches: (w) => held(w).some(isMeme),
  },
  {
    id: 6,
    text: "You trade a lot. Your fees thank you.",
    matches: (w) => w.signatureCount >= SIGNATURE_LIMIT,
  },
  {
    id: 7,
    text: "Big balance. Small personality.",
    matches: (w) => w.lamports >= WHALE_SOL,
  },
  {
    id: 8,
    text: "Just SOL. Vanilla, but honest.",
    matches: (w) => w.tokens.length === 0,
  },
  { id: 9, text: "Clean wallet. Suspiciously clean.", matches: () => true },
];

export const DEFAULT_RULE_ID = 9;

export function roast(w: WalletData): Roast {
  const rule = RULES.find((r) => r.matches(w));
  // The default rule always matches, so this is unreachable. Keep it type-safe anyway.
  const chosen = rule ?? RULES[RULES.length - 1]!;
  return { ruleId: chosen.id, text: chosen.text };
}

/** SOL balance as a display string, using bigint math so large balances stay exact. */
export function formatSol(lamports: bigint): string {
  const whole = lamports / LAMPORTS_PER_SOL;
  const frac = (lamports % LAMPORTS_PER_SOL).toString().padStart(9, "0").slice(0, 4);
  return `${whole.toString()}.${frac}`;
}
