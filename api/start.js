export default async function handler(req, res) {
  const TOKEN = "7621782659:AAEYhwD68j_wYxJo5vX72fCEo3xF9RYYgEU";

  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  const body = req.body;
  const chatId = body.message?.chat?.id;
  const text = body.message?.text || "";

  if (!chatId) {
    return res.status(200).json({ ok: true });
  }

  if (text === "/start") {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "🚀 Welcome to NEWTUBE TON BOT\n\nWatch Ads & Earn TON Easily\n\nJoin our official links below:",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "👥 Official Group", url: "https://t.me/newTon_Gc" }
            ],
            [
              { text: "📢 Official Channel", url: "https://t.me/NEEWTON_OFFICIAL" }
            ],
            [
              { text: "🎁 Invite Friends", url: "https://t.me/NewTube12_bot/TonFREE?startapp" }
            ]
          ]
        }
      })
    });
  }

  res.status(200).json({ ok: true });
}
