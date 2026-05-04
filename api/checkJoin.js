// ════════════════════════════════════════════════════════════
// api/checkJoin.js  —  NEWTUBE TON  (Secure v2)
// ════════════════════════════════════════════════════════════
// কাজ: User আমাদের Telegram channel + group এ join করেছে কিনা
//       check করে। না করলে app lock হয়।
// Security: userId validate, Telegram Bot API direct call,
//           error safe fallback.
// ════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "https://new-ton-8835.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET")
    return res.status(405).json({ ok: false, message: "Method not allowed" });

  const { userId } = req.query;

  // ── Validate ──────────────────────────────────────────────
  if (!userId || !/^\d{5,15}$/.test(String(userId))) {
    return res.status(400).json({ ok: false, joined: false, message: "Invalid userId" });
  }

  const BOT_TOKEN  = process.env.BOT_TOKEN;
  const CHANNEL_ID = process.env.CHANNEL_ID; // e.g. @NEEWTON_OFFICIAL or -1001234567890
  const GROUP_ID   = process.env.GROUP_ID;   // e.g. @newTon_Gc or -1009876543210

  if (!BOT_TOKEN || !CHANNEL_ID || !GROUP_ID) {
    console.error("checkJoin: Missing env vars");
    return res.status(500).json({ ok: false, joined: false, message: "Config error" });
  }

  // ── Check member status ───────────────────────────────────
  async function isMember(chatId) {
    try {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${userId}`;
      const r   = await fetch(url);
      const d   = await r.json();
      if (!d.ok) return false;
      const status = d.result?.status;
      return ["member", "administrator", "creator"].includes(status);
    } catch {
      return false;
    }
  }

  const [inChannel, inGroup] = await Promise.all([
    isMember(CHANNEL_ID),
    isMember(GROUP_ID),
  ]);

  return res.status(200).json({
    ok:        true,
    joined:    inChannel && inGroup,
    inChannel,
    inGroup,
  });
}
