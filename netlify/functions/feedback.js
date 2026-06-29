// Feedback API — sparar till Supabase + mailar via SendGrid
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  const adminKey = process.env.ADMIN_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || "https://icuwxxtvhvhogmycnspl.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  const KATEGORI_EMOJIS = {
    aktier: "📈", krypto: "₿", fonder: "📊", ekonomi: "💰",
    pro: "⭐", app: "📱", fel: "🐛", forbattring: "💡",
    funktion: "✨", ovrigt: "💬", support: "🛟"
  };

  // ── POST: Ta emot feedback ────────────────────────────────────────────
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const { typ, meddelande, sida, betyg, version, kategori } = body;

      if (!meddelande || meddelande.trim().length < 3) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Meddelande krävs" }) };
      }

      const now = new Date();
      const datumStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const kortKod = Math.random().toString(36).slice(2, 6).toUpperCase();
      const nyckel = `KAP-${datumStr}-${kortKod}`;
      const kategoriKey = kategori || typ || "ovrigt";
      const emoji = KATEGORI_EMOJIS[kategoriKey] || "💬";
      const betygStars = betyg ? "⭐".repeat(betyg) : "Inget betyg";

      const entry = {
        nyckel,
        typ: kategoriKey,
        emoji,
        meddelande: meddelande.trim().slice(0, 1000),
        sida: sida || "okänd",
        betyg: betyg || null,
        version: version || "1.0",
        skapad: now.toISOString(),
      };

      // Spara i Supabase feedback-tabell
      if (supabaseKey) {
        await fetch(`${supabaseUrl}/rest/v1/feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify(entry),
        }).catch(e => console.log("Supabase fel:", e.message));
      }

      // Skicka mail via SendGrid
      if (sendgridKey) {
        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${sendgridKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: "hej@mykapital.se" }] }],
            from: { email: "noreply@mykapital.se", name: "Kapital Feedback" },
            subject: `${emoji} [${nyckel}] ${kategoriKey}`,
            content: [{
              type: "text/html",
              value: `<div style="font-family:Arial;max-width:600px;background:#0f172a;color:#e2e8f0;padding:24px;border-radius:12px">
                <div style="background:#10b98122;border:1px solid #10b98133;border-radius:10px;padding:16px;margin-bottom:20px">
                  <div style="font-size:22px;margin-bottom:6px">${emoji} Ny feedback</div>
                  <div style="font-size:26px;font-weight:900;color:#10b981;letter-spacing:2px">${nyckel}</div>
                </div>
                <p><b>Kategori:</b> ${emoji} ${kategoriKey}</p>
                <p><b>Betyg:</b> ${betygStars}</p>
                <p><b>Sida:</b> ${sida || "okänd"}</p>
                <p><b>Tid:</b> ${now.toLocaleString("sv-SE")}</p>
                <div style="background:#1e293b;border-radius:10px;padding:16px;margin:16px 0">
                  <b>Meddelande:</b><br/><br/>
                  ${meddelande.trim().replace(/\n/g, "<br>")}
                </div>
                <a href="https://mykapital.se/admin" style="background:linear-gradient(135deg,#10b981,#0ea5e9);color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700">Öppna admin →</a>
              </div>`
            }]
          }),
        }).catch(e => console.log("Mail fel:", e.message));
      }

      return { statusCode: 201, headers, body: JSON.stringify({ success: true, nyckel }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── GET: Hämta feedback (admin) ──────────────────────────────────────
  if (event.httpMethod === "GET") {
    const reqKey = event.headers["x-admin-key"] || event.queryStringParameters?.key;
    if (!adminKey || reqKey !== adminKey) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Obehörig" }) };
    }

    if (!supabaseKey) {
      return { statusCode: 200, headers, body: JSON.stringify([]) };
    }

    try {
      const resp = await fetch(`${supabaseUrl}/rest/v1/feedback?order=skapad.desc&limit=100`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      });
      const data = await resp.json();
      return { statusCode: 200, headers, body: JSON.stringify(Array.isArray(data) ? data : []) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── DELETE ───────────────────────────────────────────────────────────
  if (event.httpMethod === "DELETE") {
    const reqKey = event.headers["x-admin-key"] || event.queryStringParameters?.key;
    if (!adminKey || reqKey !== adminKey) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Obehörig" }) };
    }
    try {
      const { id } = JSON.parse(event.body || "{}");
      if (supabaseKey && id) {
        await fetch(`${supabaseUrl}/rest/v1/feedback?id=eq.${id}`, {
          method: "DELETE",
          headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
        });
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
};
