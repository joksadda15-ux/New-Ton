export default async function handler(req, res) {
  const TOKEN = process.env.BOT_TOKEN;

  // 🔐 তোমার admin key (change করতে চাইলে এখানে করবা)
  const ADMIN_KEY = "Rashu777";

  const key = req.query.key;
  const message = req.query.message;

  // 🔒 security check
  if (!key || key !== ADMIN_KEY) {
    return res.status(403).json({ error: "Unauthorized access" });
  }

  if (!message) {
    return res.status(400).json({ error: "Message required" });
  }

  const BATCH_SIZE = 50;

  try {
    const response = await fetch("https://newtube-ton-default-rtdb.firebaseio.com/users.json");
    const data = await response.json();

    if (!data) {
      return res.status(200).json({ success: false, msg: "No users" });
    }

    const users = Object.values(data);

    let sent = 0;
    let failed = 0;

    // 🔥 AUTO LOOP
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      for (const user of batch) {
        try {
          if (!user.chat_id) continue;

          await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: user.chat_id,
              text: decodeURIComponent(message),
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "🎁 START EARNING",
                      url: "https://t.me/NewTube12_bot/TonFREE?startapp=7054894635"
                    }
                  ]
                ]
              }
            })
          });

          sent++;

          // ⏱️ anti-ban delay
          await new Promise(r => setTimeout(r, 40));

        } catch (err) {
          failed++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      total: users.length,
      sent,
      failed
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
