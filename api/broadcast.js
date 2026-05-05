// api/broadcast.js — NEWTUBE TON
import { getDb } from "./_firebase.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const adminSecret = req.headers["x-admin-secret"];
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET)
    return res.status(401).json({ ok: false, message: "Unauthorized" });

  const { message } = req.body ?? {};
  if (!message || typeof message !== "string" || message.trim().length < 5)
    return res.status(400).json({ ok: false, message: "Message too short" });
  if (message.length > 1000)
    return res.status(400).json({ ok: false, message: "Message too long" });

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) return res.status(500).json({ ok: false, message: "BOT_TOKEN missing" });

  try {
    const db   = getDb();
    const snap = await db.collection("users").where("isBanned", "==", false).select().get();
    const ids  = snap.docs.map((d) => d.id);
    let sent = 0;

    for (let i = 0; i < ids.length; i++) {
      try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: ids[i], text: message.trim(), parse_mode: "HTML" }),
        });
        sent++;
      } catch {}
      if (i % 20 === 19) await sleep(1100);
    }

    return res.status(200).json({ ok: true, sent });
  } catch (err) {
    console.error("broadcast error:", err.message);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
