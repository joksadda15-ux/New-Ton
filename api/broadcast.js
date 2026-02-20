export default async function handler(req, res) {

  const TOKEN = process.env.BOT_TOKEN;

  const response = await fetch("https://newtube-ton-default-rtdb.firebaseio.com/users.json");
  const data = await response.json();

  if (!data) {
    return res.status(200).json({ success: false, message: "No users found" });
  }

  const users = Object.values(data);

  for (const user of users) {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: user.chat_id,
        text: "🔥 12hr Reminder!\n\nCome back & earn more TON now!"
      })
    });
  }

  return res.status(200).json({ success: true });
}
