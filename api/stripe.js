const Stripe = require("stripe");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    if (req.method === "POST" && req.body.action === "create-checkout") {
      const { plan } = req.body;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [{
          price_data: {
            currency: "sek",
            product_data: {
              name: "Kapital Pro",
              description: plan === "yearly"
                ? "Obegränsade analyser — 399 kr/år"
                : "Obegränsade analyser — 49 kr/mån",
            },
            recurring: {
              interval: plan === "yearly" ? "year" : "month",
            },
            unit_amount: plan === "yearly" ? 39900 : 4900,
          },
          quantity: 1,
        }],
        success_url: `${req.headers.origin}?payment=success`,
        cancel_url: `${req.headers.origin}?payment=cancelled`,
      });

      return res.status(200).json({ url: session.url });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
