export default async function handler(req, res) {

  const TOKEN = process.env.BOT_TOKEN;
  const ADMIN_KEY = "Rashu777";

  const { key, message } = req.query;

  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (!message) {
    return res.status(400).json({ error: "Message required" });
  }

  const response = await fetch("https://newtube-ton-default-rtdb.firebaseio.com/users.json");
  const data = await response.json();

  if (!data) {
    return res.status(200).json({ success: false });
  }

  const users = Object.values(data);

  for (const user of users) {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: user.chat_id,
        text: message,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎁 GET CLAIM",
                url: "https://your-mini-app-link.com"
              }
            ]
          ]
        }
      })
    });
  }

  return res.status(200).json({ success: true });
}
