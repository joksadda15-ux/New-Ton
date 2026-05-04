// ════════════════════════════════════════════════════════════
// api/checkMember.js  —  NEWTUBE TON  (Secure v2)
// ════════════════════════════════════════════════════════════
// কাজ: Task section এ কোনো specific channel/group এ
//       user join করেছে কিনা check করে।
// Security: channel input sanitize (@ বা -100 prefix enforce),
//           userId validate.
// ════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "https://new-ton-8835.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET")
    return res.status(405).json({ ok: false, message: "Method not allowed" });

  const { userId, channel } = req.query;

  // ── Validate userId ───────────────────────────────────────
  if (!userId || !/^\d{5,15}$/.test(String(userId))) {
    return res.status(400).json({ ok: false, joined: false, message: "Invalid userId" });
  }

  // ── Validate channel param ────────────────────────────────
  // Allowed: @username  OR  -100xxxxxxxxxx (supergroup/channel id)
  const ch = String(channel || "").trim();
  if (!ch || (!/^@[\w]{3,32}$/.test(ch) && !/^-100\d{7,14}$/.test(ch))) {
    return res.status(400).json({ ok: false, joined: false, message: "Invalid channel" });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    return res.status(500).json({ ok: false, joined: false, message: "Config error" });
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(ch)}&user_id=${userId}`;
    const r   = await fetch(url);
    const d   = await r.json();

    if (!d.ok) {
      // Bot is not in that chat or other TG error
      return res.status(200).json({ ok: true, joined: false });
    }

    const status = d.result?.status;
    const joined = ["member", "administrator", "creator"].includes(status);

    return res.status(200).json({ ok: true, joined });
  } catch (err) {
    console.error("checkMember error:", err);
    return res.status(500).json({ ok: false, joined: false, message: "Server error" });
  }
}
