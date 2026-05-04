// ════════════════════════════════════════════════════════════
// api/broadcast.js  —  NEWTUBE TON  (Secure v2)
// ════════════════════════════════════════════════════════════
// কাজ: Admin সব users কে Telegram message পাঠায়।
// Security:
//   1. ADMIN_SECRET header required (unauthorized block)
//   2. Message length limit
//   3. Batch send (Telegram rate limit safe)
//   4. Banned user skip
// ════════════════════════════════════════════════════════════

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

// Telegram message পাঠানো
async function sendTgMsg(botToken, chatId, text) {
  try {
    await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id:    chatId,
          text,
          parse_mode: "HTML",
        }),
      }
    );
  } catch {
    // silent fail per user
  }
}

// delay helper
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  // Admin only — no CORS needed (internal tool)
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, message: "Method not allowed" });

  // ── Admin auth ────────────────────────────────────────────
  const adminSecret = req.headers["x-admin-secret"];
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const { message } = req.body ?? {};

  if (!message || typeof message !== "string" || message.trim().length < 5) {
    return res.status(400).json({ ok: false, message: "Message too short" });
  }
  if (message.length > 1000) {
    return res.status(400).json({ ok: false, message: "Message too long (max 1000 chars)" });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN)
    return res.status(500).json({ ok: false, message: "BOT_TOKEN missing" });

  try {
    const db    = getDb();
    const snap  = await db.collection("users")
      .where("isBanned", "==", false)
      .select() // only IDs (no heavy data)
      .get();

    let sent = 0, failed = 0;

    // Batch: 20 per second (Telegram limit safe)
    const ids = snap.docs.map((d) => d.id);
    for (let i = 0; i < ids.length; i++) {
      await sendTgMsg(BOT_TOKEN, ids[i], message.trim());
      sent++;
      if (i % 20 === 19) await sleep(1100); // 1.1s pause every 20
    }

    return res.status(200).json({ ok: true, sent, failed });

  } catch (err) {
    console.error("broadcast error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
