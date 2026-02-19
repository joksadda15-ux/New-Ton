import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";

export default async function handler(req, res) {

  const TOKEN = process.env.BOT_TOKEN;

  if (!TOKEN) {
    return res.status(500).json({ error: "Bot token not found" });
  }

  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  const chatId = body.message?.chat?.id;
  const text = body.message?.text || "";

  if (!chatId) {
    return res.status(200).json({ ok: true });
  }

  if (text === "/start") {

    await setDoc(doc(db, "users", String(chatId)), {
      id: chatId,
      joinedAt: Date.now()
    });

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "🚀 Welcome to NEWTUBE TON BOT\n\nWatch Ads & Earn TON Easily",
      })
    });
  }

  return res.status(200).json({ ok: true });
}
