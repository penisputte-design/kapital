// Feedback API — sparar till Netlify Blobs + mailar till hej@mykapital.se
const { getStore } = require("@netlify/blobs");

// Kategori-nycklar för snabb identifiering
const KATEGORI_EMOJIS = {
  aktier: "📈", krypto: "₿", fonder: "📊", ekonomi: "💰",
  pro: "⭐", app: "📱", fel: "🐛", forbattring: "💡",
  funktion: "✨", ovrigt: "💬"
};

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
  const sendgridKey = process.env.SENDGRID_API_KEY;

  // ── POST: Spara ny feedback + skicka mail ──────────────────────────────
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const { typ, meddelande, sida, betyg, version, kategori } = body;

      if (!meddelande || meddelande.trim().length < 3) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Meddelande krävs" }) };
      }

      // Generera unik nyckel — enkel och läsbar
      const now = new Date();
      const datumStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const kortKod = Math.random().toString(36).slice(2, 6).toUpperCase();
      const nyckel = `KAP-${datumStr}-${kortKod}`;

      const id = `feedback_${Date.now()}_${kortKod}`;
      const kategoriKey = kategori || typ || "ovrigt";
      const emoji = KATEGORI_EMOJIS[kategoriKey] || "💬";

      const entry = {
        id,
        nyckel,
        typ: kategoriKey,
        emoji,
        meddelande: meddelande.trim().slice(0, 1000),
        sida: sida || "okänd",
        betyg: betyg || null,
        version: version || "1.0",
        tid: now.toISOString(),
        last: false,
      };

      // Spara i Netlify Blobs
      await store.setJSON(id, entry);

      // Skicka mail via SendGrid (om nyckel finns)
      if (sendgridKey) {
        const betygStars = betyg ? "⭐".repeat(betyg) : "Inget betyg";
        const mailBody = {
          personalizations: [{ to: [{ email: "hej@mykapital.se" }] }],
          from: { email: "noreply@mykapital.se", name: "Kapital Feedback" },
          reply_to: { email: "hej@mykapital.se" },
          subject: `${emoji} [${nyckel}] Ny feedback — ${kategoriKey}`,
          content: [{
            type: "text/plain",
            value: `Ny feedback från Kapital-appen

Nyckel: ${nyckel}
Kategori: ${emoji} ${kategoriKey}
Betyg: ${betygStars}
Tid: ${now.toLocaleString("sv-SE")}
Sida: ${sida || "okänd"}

Meddelande:
${meddelande.trim()}

---
Admin-panel: mykapital.se/admin
Svara direkt på detta mail för att kontakta användaren.`
          }, {
            type: "text/html",
            value: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:24px;border-radius:12px">
  <div style="background:#10b98122;border:1px solid #10b98133;border-radius:10px;padding:16px;margin-bottom:20px">
    <div style="font-size:24px;margin-bottom:8px">${emoji} Ny feedback</div>
    <div style="font-size:28px;font-weight:900;color:#10b981;letter-spacing:2px">${nyckel}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr><td style="padding:8px;color:#64748b;width:120px">Kategori</td><td style="padding:8px;font-weight:600">${emoji} ${kategoriKey}</td></tr>
    <tr><td style="padding:8px;color:#64748b">Betyg</td><td style="padding:8px">${betygStars}</td></tr>
    <tr><td style="padding:8px;color:#64748b">Tid</td><td style="padding:8px">${now.toLocaleString("sv-SE")}</td></tr>
    <tr><td style="padding:8px;color:#64748b">Sida</td><td style="padding:8px">${sida || "okänd"}</td></tr>
  </table>

  <div style="background:#1e293b;border-radius:10px;padding:16px;margin-bottom:20px">
    <div style="color:#64748b;font-size:12px;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Meddelande</div>
    <div style="font-size:15px;line-height:1.6">${meddelande.trim().replace(/\n/g, "<br>")}</div>
  </div>

  <a href="https://mykapital.se/admin" style="display:inline-block;padding:10px 20px;background:linear-gradient(135deg,#10b981,#0ea5e9);border-radius:8px;color:#fff;text-decoration:none;font-weight:700">
    Öppna admin-panel →
  </a>
</div>`
          }]
        };

        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${sendgridKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mailBody),
        }).catch(e => console.log("Mail fel:", e.message));
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, id, nyckel }),
      };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── GET: Hämta all feedback (admin only) ────────────────────────────────
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

  // ── DELETE: Ta bort feedback ─────────────────────────────────────────────
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
