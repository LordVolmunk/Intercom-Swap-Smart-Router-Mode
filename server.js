import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

/* ===================================
   SMART BEST ROUTE FUNCTION
=================================== */

async function findBestRoute(tokenA, tokenB) {
  try {
    const response = await axios.get(
      `https://api.dexscreener.com/latest/dex/search/?q=${tokenA}`
    );

    const pairs = response.data.pairs;

    if (!pairs || pairs.length === 0) {
      return { error: "No pairs found." };
    }

    const matches = pairs.filter(
      (p) =>
        p.baseToken.symbol.toLowerCase() === tokenA.toLowerCase() &&
        p.quoteToken.symbol.toLowerCase() === tokenB.toLowerCase()
    );

    if (matches.length === 0) {
      return { error: `Direct route ${tokenA}/${tokenB} not found.` };
    }

    // Sort by liquidity highest
    matches.sort(
      (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    );

    const best = matches[0];

    return {
      pair: `${best.baseToken.symbol}/${best.quoteToken.symbol}`,
      dex: best.dexId,
      priceUsd: best.priceUsd,
      liquidityUsd: best.liquidity?.usd,
      volume24h: best.volume?.h24,
      message: "Best route selected by highest liquidity",
    };
  } catch (err) {
    return { error: "Failed to fetch route." };
  }
}

/* ===================================
   API ENDPOINT
=================================== */

app.get("/route", async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({
      error: "Usage: /route?from=TOKENA&to=TOKENB",
    });
  }

  const result = await findBestRoute(from, to);
  res.json(result);
});

/* ===================================
   HEALTH CHECK
=================================== */

app.get("/", (req, res) => {
  res.send("🚀 IntercomSwap Smart Router API is running");
});

/* ===================================
   START SERVER
=================================== */

app.listen(PORT, () => {
  console.log("====================================");
  console.log("🚀 IntercomSwap Smart Router API");
  console.log("Running on http://localhost:3000");
  console.log("Example:");
  console.log("http://localhost:3000/route?from=ETH&to=USDT");
  console.log("====================================");
});