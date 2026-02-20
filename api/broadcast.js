export default async function handler(req, res) {

  const TOKEN = process.env.BOT_TOKEN;

  const users = [7054894635]; // তোমার chat id

  for (const chatId of users) {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "🔥 12hr Reminder!\n\nCome back & earn more TON now!"
      })
    });
  }

  return res.status(200).json({ success: true });
}
