const axios = require("axios");

async function findRoute(tokenA, tokenB) {
    try {
        const response = await axios.get(
            `https://api.dexscreener.com/latest/dex/search/?q=${tokenA}`
        );

        const pairs = response.data.pairs;

        if (!pairs || pairs.length === 0) {
            return "❌ No pairs found.";
        }

        const match = pairs.find(p =>
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

module.exports = { findRoute };