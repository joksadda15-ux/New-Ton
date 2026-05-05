// api/checkJoin.js — NEWTUBE TON
export default async function handler(req, res) {
  const origin = process.env.ALLOWED_ORIGIN || "https://new-ton-8835.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const { userId } = req.query;
  if (!userId || !/^\d{5,15}$/.test(String(userId)))
    return res.status(400).json({ ok: false, joined: false });

  const BOT_TOKEN  = process.env.BOT_TOKEN;
  const CHANNEL_ID = process.env.CHANNEL_ID;
  const GROUP_ID   = process.env.GROUP_ID;

  if (!BOT_TOKEN || !CHANNEL_ID || !GROUP_ID)
    return res.status(500).json({ ok: false, joined: false, message: "Config missing" });

  async function getMemberStatus(chatId) {
    try {
      const r = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${userId}`
      );
      const d = await r.json();
      if (!d.ok) return false;
      return ["member", "administrator", "creator"].includes(d.result?.status);
    } catch { return false; }
  }

  const [inChannel, inGroup] = await Promise.all([
    getMemberStatus(CHANNEL_ID),
    getMemberStatus(GROUP_ID),
  ]);

  return res.status(200).json({
    ok: true,
    joined: inChannel && inGroup,
    inChannel,
    inGroup,
  });
}
