// api/checkMember.js — NEWTUBE TON
export default async function handler(req, res) {
  const origin = process.env.ALLOWED_ORIGIN || "https://new-ton-8835.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const { userId, channel } = req.query;

  if (!userId || !/^\d{5,15}$/.test(String(userId)))
    return res.status(400).json({ ok: false, joined: false });

  const ch = String(channel || "").trim();
  if (!ch || (!/^@[\w]{3,32}$/.test(ch) && !/^-100\d{7,14}$/.test(ch)))
    return res.status(400).json({ ok: false, joined: false, message: "Invalid channel" });

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) return res.status(500).json({ ok: false, joined: false });

  try {
    const r = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(ch)}&user_id=${userId}`
    );
    const d = await r.json();
    if (!d.ok) return res.status(200).json({ ok: true, joined: false });
    const joined = ["member", "administrator", "creator"].includes(d.result?.status);
    return res.status(200).json({ ok: true, joined });
  } catch (err) {
    console.error("checkMember error:", err.message);
    return res.status(500).json({ ok: false, joined: false });
  }
}
