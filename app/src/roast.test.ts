import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULE_ID,
  LAMPORTS_PER_SOL,
  RULES,
  SIGNATURE_LIMIT,
  formatSol,
  roast,
  type TokenHolding,
  type WalletData,
} from "./roast";

const tok = (i: number, over: Partial<TokenHolding> = {}): TokenHolding => ({
  mint: `mint${i}`,
  amount: 1n,
  ...over,
});

const wallet = (over: Partial<WalletData> = {}): WalletData => ({
  lamports: 5n * LAMPORTS_PER_SOL,
  tokens: [tok(0)],
  signatureCount: 10,
  ...over,
});

describe("roast rules", () => {
  it("zero transactions -> fresh wallet", () => {
    expect(roast(wallet({ signatureCount: 0 }))).toEqual({
      ruleId: 0,
      text: "Fresh wallet. Smells new.",
    });
  });

  it("under 0.01 SOL -> gas station snack", () => {
    expect(roast(wallet({ lamports: 9_999_999n })).ruleId).toBe(1);
  });

  it("exactly 0.01 SOL is not low", () => {
    expect(roast(wallet({ lamports: 10_000_000n })).ruleId).not.toBe(1);
  });

  it("more than 50 held tokens -> yard sale", () => {
    const tokens = Array.from({ length: 51 }, (_, i) => tok(i));
    expect(roast(wallet({ tokens })).ruleId).toBe(2);
  });

  it("exactly 50 held tokens is not a yard sale", () => {
    const tokens = Array.from({ length: 50 }, (_, i) => tok(i));
    expect(roast(wallet({ tokens })).ruleId).not.toBe(2);
  });

  it("many empty token accounts -> clutter", () => {
    const tokens = Array.from({ length: 10 }, (_, i) => tok(i, { amount: 0n }));
    expect(roast(wallet({ tokens })).ruleId).toBe(3);
  });

  it("more than 10 tokens under $1 -> dust", () => {
    const tokens = Array.from({ length: 11 }, (_, i) => tok(i, { usdValue: 0.5 }));
    expect(roast(wallet({ tokens })).ruleId).toBe(4);
  });

  it("unknown prices are not counted as dust", () => {
    const tokens = Array.from({ length: 11 }, (_, i) => tok(i));
    expect(roast(wallet({ tokens })).ruleId).not.toBe(4);
  });

  it("meme symbol -> memes believe in you", () => {
    expect(roast(wallet({ tokens: [tok(0, { symbol: "bonk" })] })).ruleId).toBe(5);
  });

  it("known meme mint without a symbol also matches", () => {
    const mint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
    expect(roast(wallet({ tokens: [{ mint, amount: 5n }] })).ruleId).toBe(5);
  });

  it("an empty meme account does not count as holding one", () => {
    expect(roast(wallet({ tokens: [tok(0, { symbol: "BONK", amount: 0n })] })).ruleId).not.toBe(5);
  });

  it("100 recent signatures -> trades a lot", () => {
    expect(roast(wallet({ signatureCount: SIGNATURE_LIMIT })).ruleId).toBe(6);
  });

  it("100+ SOL -> big balance", () => {
    expect(roast(wallet({ lamports: 100n * LAMPORTS_PER_SOL })).ruleId).toBe(7);
  });

  it("no token accounts -> just SOL", () => {
    expect(roast(wallet({ tokens: [] })).ruleId).toBe(8);
  });

  it("default -> suspiciously clean", () => {
    expect(roast(wallet())).toEqual({
      ruleId: DEFAULT_RULE_ID,
      text: "Clean wallet. Suspiciously clean.",
    });
  });

  it("priority: fresh beats low SOL", () => {
    expect(roast(wallet({ signatureCount: 0, lamports: 0n })).ruleId).toBe(0);
  });

  it("priority: yard sale beats meme", () => {
    const tokens = [...Array.from({ length: 51 }, (_, i) => tok(i)), tok(99, { symbol: "WIF" })];
    expect(roast(wallet({ tokens })).ruleId).toBe(2);
  });
});

describe("rule table", () => {
  it("ids are unique, sequential and fit in a u8", () => {
    expect(RULES.map((r) => r.id)).toEqual(RULES.map((_, i) => i));
    expect(RULES.length).toBeLessThanOrEqual(255);
  });

  it("the last rule is the always-matching default", () => {
    expect(RULES[RULES.length - 1]!.id).toBe(DEFAULT_RULE_ID);
    expect(RULES[RULES.length - 1]!.matches(wallet())).toBe(true);
  });
});

describe("formatSol", () => {
  it("formats whole and fractional SOL", () => {
    expect(formatSol(1_500_000_000n)).toBe("1.5000");
    expect(formatSol(0n)).toBe("0.0000");
    expect(formatSol(123_456_789_000_000_000n)).toBe("123456789.0000");
  });
});
