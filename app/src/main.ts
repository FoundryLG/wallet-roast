import { toPng } from "html-to-image";
import "./style.css";
import { formatSol, roast } from "./roast";
import { fetchWallet, parseAddress } from "./wallet";

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

const form = $<HTMLFormElement>("form");
const input = $<HTMLInputElement>("address");
const go = $<HTMLButtonElement>("go");
const errorEl = $("error");
const card = $("card");
const roastEl = $("roast");
const addrEl = $("addr");
const statsEl = $("stats");
const actions = $("actions");

function showError(msg: string) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
  card.hidden = true;
  actions.hidden = true;
}

function short(a: string) {
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;

  const owner = parseAddress(input.value);
  if (!owner) {
    showError("That is not a valid Solana address. Paste the full base58 wallet address.");
    return;
  }

  go.disabled = true;
  go.textContent = "Reading…";
  try {
    const data = await fetchWallet(owner);
    const result = roast(data);
    const held = data.tokens.filter((t) => t.amount > 0n).length;

    roastEl.textContent = result.text;
    addrEl.textContent = short(owner);
    statsEl.replaceChildren(
      ...[
        `${formatSol(data.lamports)} SOL`,
        `${held} tokens`,
        `${data.tokens.length - held} empty accounts`,
        `${data.signatureCount}${data.signatureCount >= 100 ? "+" : ""} recent txs`,
      ].map((t) => {
        const li = document.createElement("li");
        li.textContent = t;
        return li;
      }),
    );
    card.hidden = false;
    actions.hidden = false;
  } catch (err) {
    console.error(err);
    showError("Could not read that wallet. The RPC may be rate limited: set VITE_RPC_URL to your own key.");
  } finally {
    go.disabled = false;
    go.textContent = "Roast it";
  }
});

$("download").addEventListener("click", async () => {
  try {
    const url = await toPng(card, { pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = url;
    a.download = "wallet-roast.png";
    a.click();
  } catch (err) {
    console.error(err);
    showError("Could not render the card image.");
  }
});

$("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(`${roastEl.textContent ?? ""} (${addrEl.textContent ?? ""})`);
  } catch {
    showError("Could not copy to the clipboard.");
  }
});
