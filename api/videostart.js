// ════════════════════════════════════════════════════════════
// api/videoStart.js  —  NEWTUBE TON  (Secure v2)
// ════════════════════════════════════════════════════════════
// কাজ: Video mining শুরু করার সময় একটা HMAC-signed token
//       তৈরি করে দেয়। Front-end এটা store করে।
//       Claim এর সময় এই token verify করা হয়।
// Security: HMAC-SHA256 signature, userId validate,
//           banned check, daily limit pre-check.
// ════════════════════════════════════════════════════════════

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createHmac } from "crypto";

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

// HMAC signature তৈরি করে
function makeSignature(userId, startTime) {
  const secret = process.env.HMAC_SECRET;
  if (!secret) throw new Error("HMAC_SECRET not set");
  return createHmac("sha256", secret)
    .update(`${userId}:${startTime}`)
    .digest("hex");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "https://new-ton-8835.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST")
    return res.status(405).json({ ok: false, message: "Method not allowed" });

  const { userId } = req.body ?? {};

  if (!userId || !/^\d{5,15}$/.test(String(userId))) {
    return res.status(400).json({ ok: false, message: "Invalid userId" });
  }

  const uid = String(userId);

  try {
    const db   = getDb();
    const snap = await db.collection("users").doc(uid).get();

    if (!snap.exists)
      return res.status(404).json({ ok: false, message: "User not found" });

    const user = snap.data();

    if (user.isBanned)
      return res.status(403).json({ ok: false, message: "Banned" });

    // Daily limit pre-check (1000 gold/day)
    const DAILY_LIMIT = 1000;
    if ((user.dailyVideoMined || 0) >= DAILY_LIMIT) {
      return res.status(200).json({
        ok:      false,
        message: "Daily limit reached",
        dailyMined: user.dailyVideoMined,
      });
    }

    const startTime = Date.now();
    const signature = makeSignature(uid, startTime);

    return res.status(200).json({
      success:   true,
      ok:        true,
      startTime,
      signature,
      dailyMined: user.dailyVideoMined || 0,
    });

  } catch (err) {
    console.error("videoStart error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
