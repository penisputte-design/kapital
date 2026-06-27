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

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  if (!anthropicKey && !openaiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Ingen API-nyckel konfigurerad" }),
    };
  }

  const body = JSON.parse(event.body);

  // ── Försök Anthropic ────────────────────────────────────────────────────
  const tryAnthropic = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          ...body,
          max_tokens: Math.min(body.max_tokens || 800, 800),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (resp.status === 529 || resp.status === 500) return null; // Överbelastad
      const data = await resp.json();
      if (data.error) return null;
      return { statusCode: resp.status, headers, body: JSON.stringify(data) };
    } catch {
      clearTimeout(timeout);
      return null; // Timeout eller nätverksfel
    }
  };

  // ── Fallback: OpenAI GPT-4o-mini ────────────────────────────────────────
  const tryOpenAI = async () => {
    if (!openaiKey) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      // Konvertera Anthropic-format till OpenAI-format
      const messages = body.messages || [];
      const openaiMessages = messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: typeof m.content === "string" ? m.content : m.content?.[0]?.text || "",
      }));

      if (body.system) {
        openaiMessages.unshift({ role: "system", content: body.system });
      }

      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: openaiMessages,
          max_tokens: Math.min(body.max_tokens || 800, 800),
          temperature: 0.7,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await resp.json();
      if (!resp.ok || !data.choices?.[0]) return null;

      // Konvertera OpenAI-svar till Anthropic-format
      const anthropicFormat = {
        id: data.id,
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: data.choices[0].message.content }],
        model: "gpt-4o-mini",
        stop_reason: "end_turn",
        usage: {
          input_tokens: data.usage?.prompt_tokens || 0,
          output_tokens: data.usage?.completion_tokens || 0,
        },
      };

      return {
        statusCode: 200,
        headers: { ...headers, "X-Fallback-Model": "gpt-4o-mini" },
        body: JSON.stringify(anthropicFormat),
      };
    } catch {
      clearTimeout(timeout);
      return null;
    }
  };

  // ── Försök Anthropic → fallback OpenAI → retry Anthropic ───────────────
  if (anthropicKey) {
    const result = await tryAnthropic();
    if (result) return result;
  }

  // Anthropic misslyckades — försök OpenAI
  if (openaiKey) {
    const result = await tryOpenAI();
    if (result) return result;
  }

  // Båda misslyckades — försök Anthropic en gång till med färre tokens
  if (anthropicKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ ...body, max_tokens: 400, model: "claude-haiku-4-5-20251001" }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (resp.ok) {
        const data = await resp.json();
        if (!data.error) return { statusCode: 200, headers, body: JSON.stringify(data) };
      }
    } catch { clearTimeout(timeout); }
  }

  // Allt misslyckades
  return {
    statusCode: 504,
    headers,
    body: JSON.stringify({
      error: "Analystjänsten är tillfälligt otillgänglig. Försök igen om en minut.",
      retry: true,
    }),
  };
};
