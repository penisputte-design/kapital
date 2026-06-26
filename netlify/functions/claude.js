exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key not configured on server" }),
    };
  }

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  // Retry-funktion med exponentiell backoff
  const callAnthopic = async (attempt = 1) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 22000); // 22s timeout

    try {
      const body = JSON.parse(event.body);

      // Minska tokens automatiskt vid återförsök
      if (attempt > 1 && body.max_tokens > 800) {
        body.max_tokens = 800;
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // 529 = överbelastad, 500 = serverfel — försök igen
      if ((response.status === 529 || response.status === 500) && attempt < 3) {
        const vänta = attempt * 2000; // 2s, 4s
        await new Promise(r => setTimeout(r, vänta));
        return callAnthopic(attempt + 1);
      }

      const data = await response.json();
      return { statusCode: response.status, headers, body: JSON.stringify(data) };

    } catch (err) {
      clearTimeout(timeout);

      // Timeout eller nätverksfel — försök igen
      if (attempt < 3 && (err.name === "AbortError" || err.message.includes("fetch"))) {
        const vänta = attempt * 1500;
        await new Promise(r => setTimeout(r, vänta));
        return callAnthopic(attempt + 1);
      }

      return {
        statusCode: 504,
        headers,
        body: JSON.stringify({
          error: "Analystjänsten svarar inte just nu. Anthropic är tillfälligt överbelastad — försök igen om en minut.",
          retry: true,
        }),
      };
    }
  };

  return callAnthopic();
};
