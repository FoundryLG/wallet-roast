// Jupiter token metadata + prices. Public, keyless endpoints on api.jup.ag.
// Enrichment is best-effort: if Jupiter is down the roast still works, it just
// loses the symbol-based (meme) and price-based (dust) rules.
import type { TokenHolding } from "./roast";

const BASE = "https://api.jup.ag";
const PRICE_BATCH = 50; // /price/v3 accepts up to 50 ids
const SEARCH_BATCH = 100; // /tokens/v2/search accepts up to 100 comma-separated mints
const MAX_MINTS = 200; // bound the number of requests for very large wallets

export interface PriceEntry {
  usdPrice: number;
  decimals: number;
}
export interface TokenInfo {
  symbol: string;
  name: string;
}

const chunk = <T>(xs: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
};

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Jupiter ${res.status}`);
  return res.json();
}

/** Mints Jupiter has no reliable price for are simply absent from the result. */
export async function fetchPrices(mints: string[]): Promise<Map<string, PriceEntry>> {
  const out = new Map<string, PriceEntry>();
  const batches = chunk(mints, PRICE_BATCH);
  const results = await Promise.all(
    batches.map((b) => getJson(`${BASE}/price/v3?ids=${b.join(",")}`)),
  );
  for (const r of results) {
    for (const [mint, v] of Object.entries(r as Record<string, Partial<PriceEntry>>)) {
      if (typeof v?.usdPrice === "number" && typeof v.decimals === "number") {
        out.set(mint, { usdPrice: v.usdPrice, decimals: v.decimals });
      }
    }
  }
  return out;
}

export async function fetchTokenInfo(mints: string[]): Promise<Map<string, TokenInfo>> {
  const out = new Map<string, TokenInfo>();
  const batches = chunk(mints, SEARCH_BATCH);
  const results = await Promise.all(
    batches.map((b) => getJson(`${BASE}/tokens/v2/search?query=${b.join(",")}`)),
  );
  for (const r of results) {
    for (const t of r as { id?: string; symbol?: string; name?: string }[]) {
      if (t.id && t.symbol) out.set(t.id, { symbol: t.symbol, name: t.name ?? t.symbol });
    }
  }
  return out;
}

/**
 * Pure merge of market data into holdings (unit tested).
 * - `prices === null` means the lookup failed: usdValue stays undefined (unknown).
 * - A priced lookup that omits a mint means Jupiter has no reliable price: treat as $0.
 */
export function applyMarketData(
  tokens: TokenHolding[],
  prices: Map<string, PriceEntry> | null,
  info: Map<string, TokenInfo> | null,
): TokenHolding[] {
  return tokens.map((t) => {
    const next: TokenHolding = { ...t };
    const meta = info?.get(t.mint);
    if (meta) next.symbol = meta.symbol;
    if (prices && t.amount > 0n) {
      const p = prices.get(t.mint);
      // USD estimate only: Number() precision loss on huge raw amounts is fine here.
      next.usdValue = p ? (Number(t.amount) / 10 ** p.decimals) * p.usdPrice : 0;
    }
    return next;
  });
}

/** Look up symbols and prices for the tokens actually held. Never throws. */
export async function enrich(tokens: TokenHolding[]): Promise<TokenHolding[]> {
  const mints = [...new Set(tokens.filter((t) => t.amount > 0n).map((t) => t.mint))].slice(
    0,
    MAX_MINTS,
  );
  if (mints.length === 0) return tokens;
  const [prices, info] = await Promise.all([
    fetchPrices(mints).catch(() => null),
    fetchTokenInfo(mints).catch(() => null),
  ]);
  return applyMarketData(tokens, prices, info);
}
