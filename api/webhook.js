// ════════════════════════════════════════════════════════════
// api/webhook.js  —  NEWTUBE TON  (Secure v2)
// ════════════════════════════════════════════════════════════
// কাজ: Telegram Bot এর webhook receiver।
//       /start command handle করে।
// Security:
//   1. Telegram secret_token header verify
//   2. Input sanitize
//   3. Fast response (Telegram 5s timeout safe)
// ════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).end();

  // ── Telegram webhook secret verify ───────────────────────
  // Vercel এ WEBHOOK_SECRET env set করুন, তারপর
  // BotFather → setWebhook?secret_token=YOUR_SECRET
  const secret = req.headers["x-telegram-bot-api-secret-token"];
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).end();
  }

  const update = req.body;

  // ── Fast ack to Telegram ──────────────────────────────────
  res.status(200).end();

  // ── Process update async (after ack) ─────────────────────
  try {
    const msg = update?.message;
    if (!msg) return;

    const chatId = msg.chat?.id;
    const text   = msg.text || "";
    const BOT_TOKEN = process.env.BOT_TOKEN;
    if (!chatId || !BOT_TOKEN) return;

    // /start command
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const param = parts[1] ? parts[1].trim() : "";

      // Mini App link পাঠাবে
      const APP_URL = process.env.MINI_APP_URL || "https://t.me/NewTube12_bot/TonFREE";
      const refLink = param ? `${APP_URL}?startapp=${param}` : APP_URL;

      const welcomeText =
        `🎮 <b>NEWTUBE TON</b> এ স্বাগতম!\n\n` +
        `📺 Video দেখুন → 🪙 Gold কামান → 💎 Diamond হয়ে → 💰 TON withdraw করুন!\n\n` +
        `⬇️ নিচের বোতাম চেপে App খুলুন:`;

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id:    chatId,
          text:       welcomeText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "🚀 App খুলুন", web_app: { url: APP_URL } },
            ]],
          },
        }),
      });
    }

  } catch (err) {
    console.error("webhook error:", err);
  }
}
