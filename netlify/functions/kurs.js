// Kurser API — Finnhub med automatisk ticker-sökning
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  const { ticker, type } = event.queryStringParameters || {};
  if (!ticker) return { statusCode: 400, headers, body: JSON.stringify({ error: "ticker krävs" }) };

  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (!finnhubKey) return { statusCode: 503, headers, body: JSON.stringify({ error: "Finnhub API-nyckel saknas" }) };

  // ── Hjälpfunktion: hitta rätt ticker via Finnhub symbol search ──────────
  const findTicker = async (query) => {
    try {
      // Försök direkt först (om det redan är en ticker som ERIC-B.ST)
      const directResp = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(query)}&token=${finnhubKey}`
      );
      const directData = await directResp.json();
      if (directData.c && directData.c > 0) return query;

      // Sök efter bolagsnamn
      const searchResp = await fetch(
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${finnhubKey}`
      );
      const searchData = await searchResp.json();

      if (!searchData.result || searchData.result.length === 0) return null;

      // Prioritera svenska börsen (.ST), sedan övriga europeiska, sedan USA
      const results = searchData.result.filter(r => r.type === "Common Stock" || r.type === "EQS");

      const swedish = results.find(r => r.symbol?.endsWith(".ST"));
      if (swedish) return swedish.symbol;

      const european = results.find(r =>
        r.symbol?.includes(".HE") || r.symbol?.includes(".OL") ||
        r.symbol?.includes(".CO") || r.symbol?.includes(".DE")
      );
      if (european) return european.symbol;

      // USA-aktier — ta första träffen
      const us = results.find(r => !r.symbol?.includes("."));
      if (us) return us.symbol;

      return results[0]?.symbol || null;
    } catch { return null; }
  };

  // ── Hämta realtidskurs ──────────────────────────────────────────────────
  if (!type || type === "quote") {
    const resolvedTicker = await findTicker(ticker);
    if (!resolvedTicker) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "Bolag ej hittat", ticker }) };
    }

    try {
      const resp = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(resolvedTicker)}&token=${finnhubKey}`
      );
      const data = await resp.json();

      if (data.c && data.c > 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ticker: resolvedTicker,
            originalQuery: ticker,
            pris: data.c,
            oppning: data.o,
            hog: data.h,
            lag: data.l,
            foregaende: data.pc,
            andring: data.c - data.pc,
            andringProcent: ((data.c - data.pc) / data.pc * 100).toFixed(2),
            kalla: "Finnhub",
            uppdaterad: new Date().toISOString(),
          }),
        };
      }
    } catch (err) {
      console.log("Finnhub quote fel:", err.message);
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: "Ingen kursdata", ticker }) };
  }

  // ── Historisk data (för grafer) ───────────────────────────────────────
  if (type === "history") {
    const resolvedTicker = await findTicker(ticker);
    if (!resolvedTicker) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "Bolag ej hittat", ticker }) };
    }

    try {
      const to = Math.floor(Date.now() / 1000);
      const from = to - 365 * 24 * 3600;
      const resp = await fetch(
        `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(resolvedTicker)}&resolution=W&from=${from}&to=${to}&token=${finnhubKey}`
      );
      const data = await resp.json();

      if (data.s === "ok" && data.c?.length > 0) {
        const punkter = data.t.map((tid, i) => ({
          datum: new Date(tid * 1000).toISOString().split("T")[0],
          pris: data.c[i],
          hog: data.h[i],
          lag: data.l[i],
          volym: data.v[i],
        }));
        return { statusCode: 200, headers, body: JSON.stringify({ ticker: resolvedTicker, punkter, kalla: "Finnhub" }) };
      }
    } catch (err) {
      console.log("Finnhub historik fel:", err.message);
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: "Ingen historik", ticker }) };
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: "Okänd type" }) };
};
