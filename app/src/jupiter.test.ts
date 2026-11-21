import { describe, expect, it } from "vitest";
import { applyMarketData, type PriceEntry, type TokenInfo } from "./jupiter";
import { roast, LAMPORTS_PER_SOL, type TokenHolding } from "./roast";

const t = (mint: string, amount: bigint): TokenHolding => ({ mint, amount });

describe("applyMarketData", () => {
  it("adds symbol and usd value", () => {
    const prices = new Map<string, PriceEntry>([["a", { usdPrice: 2, decimals: 6 }]]);
    const info = new Map<string, TokenInfo>([["a", { symbol: "AAA", name: "Aaa" }]]);
    const [out] = applyMarketData([t("a", 3_000_000n)], prices, info);
    expect(out).toMatchObject({ symbol: "AAA", usdValue: 6 });
  });

  it("a mint missing from a successful price lookup is worth $0", () => {
    const [out] = applyMarketData([t("junk", 5n)], new Map(), new Map());
    expect(out!.usdValue).toBe(0);
  });

  it("a failed price lookup leaves usdValue unknown", () => {
    const [out] = applyMarketData([t("a", 5n)], null, null);
    expect(out!.usdValue).toBeUndefined();
  });

  it("empty accounts get no usd value", () => {
    const [out] = applyMarketData([t("a", 0n)], new Map(), new Map());
    expect(out!.usdValue).toBeUndefined();
  });

  it("feeds the dust and meme rules end to end", () => {
    const dust = Array.from({ length: 11 }, (_, i) => t(`junk${i}`, 1n));
    const wallet = { lamports: 5n * LAMPORTS_PER_SOL, signatureCount: 10 };
    expect(roast({ ...wallet, tokens: applyMarketData(dust, new Map(), new Map()) }).ruleId).toBe(4);

    const info = new Map<string, TokenInfo>([["bonk", { symbol: "Bonk", name: "Bonk" }]]);
    const memes = applyMarketData([t("bonk", 1n)], null, info);
    expect(roast({ ...wallet, tokens: memes }).ruleId).toBe(5);
  });
});
