// api/videoClaim.js — NEWTUBE TON
import { createHmac } from "crypto";
import { getDb, FieldValue } from "./_firebase.js";

function verifySignature(uid, startTime, signature) {
  const secret   = process.env.HMAC_SECRET || "default_secret";
  const expected = createHmac("sha256", secret).update(`${uid}:${startTime}`).digest("hex");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

export default async function handler(req, res) {
  const origin = process.env.ALLOWED_ORIGIN || "https://new-ton-8835.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { userId, startTime, signature, claimedPoints } = req.body ?? {};

  if (!userId || !/^\d{5,15}$/.test(String(userId)))
    return res.status(400).json({ ok: false, message: "Invalid userId" });
  if (!startTime || !signature || typeof claimedPoints !== "number")
    return res.status(400).json({ ok: false, message: "Missing fields" });

  const uid     = String(userId);
  const claimed = Math.round(claimedPoints * 100) / 100;

  if (claimed < 40 || claimed > 200)
    return res.status(400).json({ ok: false, message: "Claim must be 40–200 Gold" });

  if (!verifySignature(uid, startTime, String(signature)))
    return res.status(403).json({ ok: false, message: "Invalid signature" });

  // Time verify: 0.83 gold per 15s
  const expectedSeconds = Math.floor((claimed / 0.83) * 15);
  const actualSeconds   = Math.floor((Date.now() - Number(startTime)) / 1000);
  if (actualSeconds < expectedSeconds * 0.70)
    return res.status(403).json({ ok: false, message: "Time verification failed" });

  if (Date.now() - Number(startTime) > 4 * 60 * 60 * 1000)
    return res.status(403).json({ ok: false, message: "Session expired" });

  try {
    const db      = getDb();
    const userRef = db.collection("users").doc(uid);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists)  throw new Error("User not found");
      const user = snap.data();
      if (user.isBanned) throw new Error("Banned");

      const currentDaily = user.dailyVideoMined || 0;
      if (currentDaily >= 1000) throw new Error("Daily limit reached");

      const pointsAdd = Math.min(claimed, 1000 - currentDaily);
      tx.update(userRef, {
        pointBalance:         FieldValue.increment(pointsAdd),
        lifetimePointsEarned: FieldValue.increment(pointsAdd),
        dailyVideoMined:      FieldValue.increment(pointsAdd),
      });
      return { pointsAdded: pointsAdd };
    });

    return res.status(200).json({ ok: true, success: true, pointsAdded: result.pointsAdded });
  } catch (err) {
    if (["Banned","User not found","Daily limit reached"].includes(err.message))
      return res.status(200).json({ ok: false, message: err.message });
    console.error("videoClaim error:", err.message);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
