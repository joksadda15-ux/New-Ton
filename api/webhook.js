import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";

export default async function handler(req, res) {

  // ✅ Token hidden থাকবে (Environment Variable থেকে আসবে)
  const TOKEN = process.env.BOT_TOKEN;

  if (!TOKEN) {
    return res.status(500).json({ error: "Bot token not found" });
  }

  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  const body = req.body;

  const chatId = body.message?.chat?.id;
  const text = body.message?.text || "";

  if (!chatId) {
    return res.status(200).json({ ok: true });
  }

  // 🔹 /start command
  if (text === "/start") {

    // ✅ Firestore এ user save
    await setDoc(doc(db, "users", String(chatId)), {
      id: chatId,
      joinedAt: Date.now()
    });

    // ✅ Welcome message send
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "🚀 Welcome to NEWTUBE TON BOT\n\nWatch Ads & Earn TON Easily\n\nJoin our official links below:",
        reply_markup: {
          inline_keyboard: [
            [{ text: "👥 Official Group", url: "https://t.me/newTon_Gc" }],
            [{ text: "📢 Official Channel", url: "https://t.me/NEEWTON_OFFICIAL" }],
            [{ text: "🎁 Invite Friends", url: "https://t.me/NewTube12_bot?start" }]
          ]
        }
      })
    });
  }

  return res.status(200).json({ ok: true });
                           }
