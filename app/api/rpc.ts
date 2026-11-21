// Server-side RPC proxy. The public Solana RPC returns 403 to browsers on deployed sites,
// so the page calls this function and the function calls the RPC from the server.
// Set RPC_URL in the Vercel project (server-side, never shipped to the browser) to use a keyed provider.
const UPSTREAM = process.env.RPC_URL ?? "https://api.mainnet-beta.solana.com";

// Read-only methods the app needs. Everything else is rejected.
const ALLOWED = new Set(["getBalance", "getTokenAccountsByOwner", "getSignaturesForAddress"]);
const MAX_BODY_BYTES = 4096;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return json({ error: "POST only" }, 405);

    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json({ error: "request too large" }, 413);

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return json({ error: "invalid JSON" }, 400);
    }

    const calls = Array.isArray(payload) ? payload : [payload];
    const ok = calls.every(
      (c) => typeof c === "object" && c !== null && ALLOWED.has((c as { method?: string }).method ?? ""),
    );
    if (!ok || calls.length === 0 || calls.length > 5) return json({ error: "method not allowed" }, 400);

    try {
      const upstream = await fetch(UPSTREAM, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: text,
        signal: AbortSignal.timeout(15000),
      });
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: { "content-type": "application/json" },
      });
    } catch {
      return json({ error: "upstream RPC unavailable" }, 502);
    }
  },
};
