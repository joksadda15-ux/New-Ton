export default async function handler(req, res) {
  try {
    const TOKEN = "7621782659:AAEYhwD68j_wYxJo5vX72fCEo3xF9RYYgEU";
    const CHAT_ID = "7054894635";

    const r = await fetch(
      `https://api.telegram.org/bot${TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: "⏰ 12 hour reminder COMPLETE DAILY ADS \n\nClaim kore nao 👇",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🎁 Claim Now",
                  url: "https://t.me/Coinlytix_bot"
                }
              ]
            ]
          }
        })
      }
    );

    const data = await r.json();
    res.status(200).json(data);

  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
}
