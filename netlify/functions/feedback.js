// Feedback API — sparar feedback till Netlify Blobs (inbyggd storage)
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  const store = getStore("kapital-feedback");
  const adminKey = process.env.ADMIN_KEY;

  // ── POST: Spara ny feedback ──────────────────────────────────────────
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const { typ, meddelande, sida, betyg, version } = body;

      if (!meddelande || meddelande.trim().length < 3) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Meddelande krävs" }) };
      }

      const id = `feedback_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const entry = {
        id,
        typ: typ || "övrigt",
        meddelande: meddelande.trim().slice(0, 1000),
        sida: sida || "okänd",
        betyg: betyg || null,
        version: version || "1.0",
        tid: new Date().toISOString(),
        lust: false,
      };

      await store.setJSON(id, entry);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, id }),
      };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── GET: Hämta all feedback (admin only) ────────────────────────────
  if (event.httpMethod === "GET") {
    const reqKey = event.headers["x-admin-key"] || event.queryStringParameters?.key;
    if (!adminKey || reqKey !== adminKey) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Obehörig" }) };
    }

    try {
      const { blobs } = await store.list();
      const entries = await Promise.all(
        blobs.map(b => store.get(b.key, { type: "json" }))
      );
      const sorted = entries
        .filter(Boolean)
        .sort((a, b) => new Date(b.tid) - new Date(a.tid));

      return { statusCode: 200, headers, body: JSON.stringify(sorted) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── DELETE: Markera som löst ─────────────────────────────────────────
  if (event.httpMethod === "DELETE") {
    const reqKey = event.headers["x-admin-key"] || event.queryStringParameters?.key;
    if (!adminKey || reqKey !== adminKey) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Obehörig" }) };
    }

    try {
      const { id } = JSON.parse(event.body || "{}");
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: "id krävs" }) };
      await store.delete(id);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
};
