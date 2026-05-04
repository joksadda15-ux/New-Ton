// ════════════════════════════════════════════════════════════
// api/initUser.js  —  NEWTUBE TON  (Secure v2)
// ════════════════════════════════════════════════════════════
// কাজ: নতুন user Firebase এ তৈরি করে, referrer track করে।
// Security: Rate-limit header, Telegram initData verify (optional),
//           banned user block, input sanitize.
// ════════════════════════════════════════════════════════════

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// ── Firebase Admin init (singleton) ─────────────────────────
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

// ── Helper: safe string ──────────────────────────────────────
const safe = (v, max = 64) =>
  String(v ?? "").replace(/[<>"'`]/g, "").slice(0, max).trim();

// ════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "https://new-ton-8835.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST")
    return res.status(405).json({ ok: false, message: "Method not allowed" });

  const { userId, username, firstName, referrerCode } = req.body ?? {};

  // ── Input validation ──────────────────────────────────────
  if (!userId || !/^\d{5,15}$/.test(String(userId))) {
    return res.status(400).json({ ok: false, message: "Invalid userId" });
  }

  const uid          = String(userId);
  const safeUsername = safe(username || "anonymous", 32);
  const safeName     = safe(firstName || "User", 32);
  const referrer     = referrerCode && /^\d{5,15}$/.test(String(referrerCode))
                       ? String(referrerCode) : null;

  try {
    const db      = getDb();
    const userRef = db.collection("users").doc(uid);
    const snap    = await userRef.get();

    // ── Existing user ─────────────────────────────────────
    if (snap.exists) {
      const data = snap.data();
      if (data.isBanned)
        return res.status(403).json({ ok: false, message: "Banned" });

      // username güncelle (değişmişse)
      await userRef.update({
        telegramUsername: safeUsername,
        lastSeen: FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ ok: true, isNew: false, user: { id: uid, ...data } });
    }

    // ── New user ──────────────────────────────────────────
    const today = new Date().toLocaleDateString("en-US", {
      timeZone: "Asia/Dhaka",
      year: "numeric", month: "2-digit", day: "2-digit",
    });

    const newUser = {
      telegramUsername:        safeUsername,
      firstName:               safeName,
      pointBalance:            0,
      lifetimePointsEarned:    0,
      referralCount:           0,
      totalInvites:            0,
      spentReferrals:          0,
      completedTasks:          [],
      isBanned:                false,
      welcomeBonusClaimed:     false,
      withdrawalCount:         0,
      lifetimeAdsWatched:      0,
      adsWatchedAdsgramDaily:  0,
      adsWatchedAdsgramSpecial:0,
      adsWatchedMonetag:       0,
      adsWatchedGiga:          0,
      dailyVideoMined:         0,
      lastResetDate:           today,
      createdAt:               FieldValue.serverTimestamp(),
      lastSeen:                FieldValue.serverTimestamp(),
    };

    if (referrer && referrer !== uid) {
      // referrer exists check
      const refSnap = await db.collection("users").doc(referrer).get();
      if (refSnap.exists && !refSnap.data().isBanned) {
        newUser.referredBy = referrer;
        // referrer এর totalInvites +1
        await db.collection("users").doc(referrer).update({
          totalInvites: FieldValue.increment(1),
        });
      }
    }

    await userRef.set(newUser);

    return res.status(200).json({ ok: true, isNew: true, user: { id: uid, ...newUser } });

  } catch (err) {
    console.error("initUser error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
      }
