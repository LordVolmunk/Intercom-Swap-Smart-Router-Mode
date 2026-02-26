import axios from "axios";
import readline from "readline";

/* ===============================
   SMART ROUTE FUNCTION
================================ */

async function findRoute(tokenA, tokenB) {
  try {
    const response = await axios.get(
      `https://api.dexscreener.com/latest/dex/search/?q=${tokenA}`
    );

    const pairs = response.data.pairs;

    if (!pairs || pairs.length === 0) {
      return "❌ No pairs found.";
    }

    const match = pairs.find(
      (p) =>
        p.baseToken.symbol.toLowerCase() === tokenA.toLowerCase() &&
        p.quoteToken.symbol.toLowerCase() === tokenB.toLowerCase()
    );

    if (!match) {
      return `⚠️ Direct route ${tokenA}/${tokenB} not found.`;
    }

    return `
🔀 IntercomSwap Smart Route

Pair: ${match.baseToken.symbol}/${match.quoteToken.symbol}
DEX: ${match.dexId}
Price: $${match.priceUsd}
Liquidity: $${match.liquidity.usd}
24h Volume: $${match.volume.h24}

✅ Route available
    `;
  } catch (err) {
    return "⚠️ Error finding route.";
  }
}

/* ===============================
   TERMINAL CLI MODE
================================ */

console.log("🚀 IntercomSwap Smart Router (LOCAL MODE)");
console.log("Type: route TOKENA TOKENB");
console.log("Example: route ETH USDT");
console.log("====================================");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on("line", async (input) => {
  const parts = input.trim().split(" ");

  if (parts[0] !== "route" || parts.length !== 3) {
    console.log("Usage: route TOKENA TOKENB");
    return;
  }

  const tokenA = parts[1];
  const tokenB = parts[2];

  const result = await findRoute(tokenA, tokenB);
  console.log(result);
});