// api/initUser.js — NEWTUBE TON
import { getDb, FieldValue } from "./_firebase.js";

const safe = (v, max = 64) =>
  String(v ?? "").replace(/[<>"'`]/g, "").slice(0, max).trim();

export default async function handler(req, res) {
  const origin = process.env.ALLOWED_ORIGIN || "https://new-ton-8835.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

  const { userId, username, firstName, referrerCode } = req.body ?? {};

  if (!userId || !/^\d{5,15}$/.test(String(userId)))
    return res.status(400).json({ ok: false, message: "Invalid userId" });

  const uid      = String(userId);
  const uname    = safe(username || "anonymous", 32);
  const fname    = safe(firstName || "User", 32);
  const referrer = referrerCode && /^\d{5,15}$/.test(String(referrerCode)) && String(referrerCode) !== uid
                   ? String(referrerCode) : null;

  try {
    const db      = getDb();
    const userRef = db.collection("users").doc(uid);
    const snap    = await userRef.get();

    if (snap.exists) {
      const data = snap.data();
      if (data.isBanned) return res.status(403).json({ ok: false, message: "Banned" });
      await userRef.update({ telegramUsername: uname, lastSeen: FieldValue.serverTimestamp() });
      return res.status(200).json({ ok: true, isNew: false, user: { id: uid, ...data } });
    }

    // New user
    const today = new Date().toLocaleDateString("en-US", {
      timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit",
    });

    const newUser = {
      telegramUsername: uname, firstName: fname,
      pointBalance: 0, diamondBalance: 0, lifetimePointsEarned: 0,
      referralCount: 0, totalInvites: 0, spentReferrals: 0,
      completedTasks: [], isBanned: false, welcomeBonusClaimed: false,
      withdrawalCount: 0, lifetimeAdsWatched: 0,
      adsWatchedAdsgramDaily: 0, adsWatchedAdsgramSpecial: 0,
      adsWatchedMonetag: 0, adsWatchedGiga: 0,
      dailyVideoMined: 0, lastResetDate: today,
      createdAt: FieldValue.serverTimestamp(),
      lastSeen:  FieldValue.serverTimestamp(),
    };

    if (referrer) {
      const refSnap = await db.collection("users").doc(referrer).get();
      if (refSnap.exists && !refSnap.data().isBanned) {
        newUser.referredBy = referrer;
        await db.collection("users").doc(referrer).update({
          totalInvites: FieldValue.increment(1),
        });
      }
    }

    await userRef.set(newUser);
    return res.status(200).json({ ok: true, isNew: true, user: { id: uid, ...newUser } });

  } catch (err) {
    console.error("initUser error:", err.message);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
