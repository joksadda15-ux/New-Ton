// api/webhook.js — NEWTUBE TON
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = req.headers["x-telegram-bot-api-secret-token"];
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET)
    return res.status(401).end();

  // Fast ack
  res.status(200).end();

  try {
    const msg = req.body?.message;
    if (!msg) return;
    const chatId    = msg.chat?.id;
    const text      = msg.text || "";
    const BOT_TOKEN = process.env.BOT_TOKEN;
    if (!chatId || !BOT_TOKEN) return;

    if (text.startsWith("/start")) {
      const APP_URL = process.env.MINI_APP_URL || "https://t.me/NewTube12_bot/TonFREE";
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🎮 <b>NEWTUBE TON</b> এ স্বাগতম!\n\n📺 Video দেখুন → 🪙 Gold কামান → 💎 Diamond হয়ে → 💰 Withdraw করুন!`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "🚀 App খুলুন", web_app: { url: APP_URL } }]],
          },
        }),
      });
    }
  } catch (err) {
    console.error("webhook error:", err.message);
  }
}
