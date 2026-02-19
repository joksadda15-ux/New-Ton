export default async function handler(req, res) {

  const TOKEN = process.env.BOT_TOKEN;

  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  try {
    const body = req.body;

    const chatId = body.message?.chat?.id;
    const text = body.message?.text;

    if (text === "/start") {

      await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "Bot Working ✅"
        })
      });

    }

  } catch (err) {
    console.log(err);
  }

  return res.status(200).json({ ok: true });
}
