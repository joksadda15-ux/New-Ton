// ════════════════════════════════════════════════════════════
// api/videoClaim.js  —  NEWTUBE TON  (Secure v2)
// ════════════════════════════════════════════════════════════
// কাজ: Front-end এর video mining claim request verify করে
//       Firebase এ gold add করে।
// Security:
//   1. HMAC signature verify (fake claim block)
//   2. Time-based verification (video সত্যিই দেখেছে কিনা)
//   3. Max claim per session: 200 gold
//   4. Daily limit: 1000 gold
//   5. Firestore transaction (race condition safe)
// ════════════════════════════════════════════════════════════

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
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

function verifySignature(userId, startTime, signature) {
  const secret = process.env.HMAC_SECRET;
  if (!secret) throw new Error("HMAC_SECRET not set");
  const expected = createHmac("sha256", secret)
    .update(`${userId}:${startTime}`)
    .digest("hex");
  // timing-safe compare (prevent timing attacks)
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "https://new-ton-8835.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST")
    return res.status(405).json({ ok: false, message: "Method not allowed" });

  const { userId, startTime, signature, claimedPoints } = req.body ?? {};

  // ── Input validation ──────────────────────────────────────
  if (!userId || !/^\d{5,15}$/.test(String(userId))) {
    return res.status(400).json({ ok: false, message: "Invalid userId" });
  }
  if (!startTime || !signature || typeof claimedPoints !== "number") {
    return res.status(400).json({ ok: false, message: "Missing fields" });
  }

  const uid      = String(userId);
  const claimed  = Math.round(claimedPoints * 100) / 100;

  // ── Limits ────────────────────────────────────────────────
  const MAX_SESSION = 200;  // per session max
  const DAILY_LIMIT = 1000; // per day max
  const MIN_CLAIM   = 40;   // minimum

  if (claimed < MIN_CLAIM || claimed > MAX_SESSION) {
    return res.status(400).json({ ok: false, message: `Claim must be ${MIN_CLAIM}–${MAX_SESSION} Gold` });
  }

  // ── Signature verify ──────────────────────────────────────
  if (!verifySignature(uid, startTime, String(signature))) {
    return res.status(403).json({ ok: false, message: "Invalid signature — possible cheat detected" });
  }

  // ── Time verify: session কতক্ষণ ছিল? ────────────────────
  // 0.83 gold/15s মানে claimed gold কামাতে লাগে: (claimed / 0.83) * 15 seconds
  const expectedSeconds = Math.floor((claimed / 0.83) * 15);
  const actualSeconds   = Math.floor((Date.now() - Number(startTime)) / 1000);
  // 20% tolerance দেওয়া হলো (network delay)
  if (actualSeconds < expectedSeconds * 0.75) {
    return res.status(403).json({
      ok: false,
      message: "Time verification failed — watch more video",
    });
  }

  // ── Session token too old? (max 4 hours) ─────────────────
  const SESSION_MAX_MS = 4 * 60 * 60 * 1000;
  if (Date.now() - Number(startTime) > SESSION_MAX_MS) {
    return res.status(403).json({ ok: false, message: "Session expired. Restart video." });
  }

  try {
    const db      = getDb();
    const userRef = db.collection("users").doc(uid);

    // ── Firestore transaction ─────────────────────────────
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists)  throw new Error("User not found");

      const user = snap.data();
      if (user.isBanned) throw new Error("Banned");

      const currentDaily = user.dailyVideoMined || 0;

      // Daily limit check inside transaction
      if (currentDaily >= DAILY_LIMIT) {
        throw new Error("Daily limit reached");
      }

      // Actual gold to add (cannot exceed daily remaining)
      const remaining  = DAILY_LIMIT - currentDaily;
      const pointsAdd  = Math.min(claimed, remaining);

      tx.update(userRef, {
        pointBalance:         FieldValue.increment(pointsAdd),
        lifetimePointsEarned: FieldValue.increment(pointsAdd),
        dailyVideoMined:      FieldValue.increment(pointsAdd),
      });

      return { pointsAdded: pointsAdd };
    });

    return res.status(200).json({
      success:     true,
      ok:          true,
      pointsAdded: result.pointsAdded,
    });

  } catch (err) {
    if (err.message === "Banned")
      return res.status(403).json({ ok: false, message: "Banned" });
    if (err.message === "Daily limit reached")
      return res.status(200).json({ ok: false, message: "Daily limit reached" });
    if (err.message === "User not found")
      return res.status(404).json({ ok: false, message: "User not found" });

    console.error("videoClaim error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
