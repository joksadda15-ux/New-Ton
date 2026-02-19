export default async function handler(req, res) {

  const TOKEN = process.env.BOT_TOKEN;

  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  const body = req.body;
  const chatId = body.message?.chat?.id;
  const text = body.message?.text;

  if (text === "/start") {

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "🚀 Welcome to NEWTUBE TON BOT\nWatch ads to earn toncoin for esily\nChoose an option below:",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎁 Invite Link",
                url: `https://t.me/NewTube12_bot?start=${chatId}`
              }
            ],
            [
              {
                text: "📢 Official Channel",
                url: "https://t.me/NEEWTON_OFFICIAL"
              }
            ],
            [
              {
                text: "👥 Official Group",
                url: "https://t.me/newTon_Gc"
              }
            ]
          ]
        }
      })
    });

  }

  return res.status(200).json({ ok: true });
}
