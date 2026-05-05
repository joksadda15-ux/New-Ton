// api/videoStart.js — NEWTUBE TON
import { createHmac } from "crypto";
import { getDb } from "./_firebase.js";

export default async function handler(req, res) {
  const origin = process.env.ALLOWED_ORIGIN || "https://new-ton-8835.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { userId } = req.body ?? {};
  if (!userId || !/^\d{5,15}$/.test(String(userId)))
    return res.status(400).json({ ok: false, message: "Invalid userId" });

  const uid = String(userId);

  try {
    const db   = getDb();
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return res.status(404).json({ ok: false, message: "User not found" });

    const user = snap.data();
    if (user.isBanned) return res.status(403).json({ ok: false, message: "Banned" });
    if ((user.dailyVideoMined || 0) >= 1000)
      return res.status(200).json({ ok: false, message: "Daily limit reached" });

    const startTime = Date.now();
    const secret    = process.env.HMAC_SECRET || "default_secret";
    const signature = createHmac("sha256", secret)
      .update(`${uid}:${startTime}`)
      .digest("hex");

    return res.status(200).json({ ok: true, success: true, startTime, signature, dailyMined: user.dailyVideoMined || 0 });
  } catch (err) {
    console.error("videoStart error:", err.message);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
