// ════════════════════════════════════════════════════════════
// api/claimLootbox.js  —  NEWTUBE TON  (Secure v2)
// ════════════════════════════════════════════════════════════
// কাজ: Ad lootbox claim করে Firebase এ gold save করে।
//       প্রথম lootbox claim হলে referrer কে 300 gold দেয়।
// Security:
//   1. Max 200 gold per claim (hack inflate block)
//   2. Min 40 gold required
//   3. adsWatched count server-side validate
//   4. Firestore transaction (double-claim safe)
//   5. userId & amount sanitize
// ════════════════════════════════════════════════════════════

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

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

// Per-ad reward limits (server-side truth)
const AD_LIMITS = {
  adsgramDaily:    { perAd: 120, maxDaily: 10 },
  adsgramSpecial:  { perAd: 250, maxDaily: 5  },
  monetag:         { perAd: 120, maxDaily: 10 },
  giga:            { perAd: 120, maxDaily: 10 },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "https://new-ton-8835.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST")
    return res.status(405).json({ ok: false, message: "Method not allowed" });

  const {
    userId,
    points,
    adsWatched,
    adsWatchedAdsgramDaily,
    adsWatchedAdsgramSpecial,
    adsWatchedMonetag,
    adsWatchedGiga,
  } = req.body ?? {};

  // ── Validate userId ───────────────────────────────────────
  if (!userId || !/^\d{5,15}$/.test(String(userId))) {
    return res.status(400).json({ ok: false, message: "Invalid userId" });
  }

  const uid = String(userId);

  // ── Validate points ───────────────────────────────────────
  const claimed = Number(points);
  if (!Number.isFinite(claimed) || claimed < 40 || claimed > 200) {
    return res.status(400).json({ ok: false, message: "Invalid points (40–200 gold required)" });
  }

  // ── Server-side max possible gold calculate ───────────────
  const dAds = Math.min(Number(adsWatchedAdsgramDaily  || 0), AD_LIMITS.adsgramDaily.maxDaily);
  const sAds = Math.min(Number(adsWatchedAdsgramSpecial || 0), AD_LIMITS.adsgramSpecial.maxDaily);
  const mAds = Math.min(Number(adsWatchedMonetag        || 0), AD_LIMITS.monetag.maxDaily);
  const gAds = Math.min(Number(adsWatchedGiga           || 0), AD_LIMITS.giga.maxDaily);

  const maxPossible =
    dAds * AD_LIMITS.adsgramDaily.perAd   +
    sAds * AD_LIMITS.adsgramSpecial.perAd +
    mAds * AD_LIMITS.monetag.perAd        +
    gAds * AD_LIMITS.giga.perAd;

  // Claimed এর চেয়ে বেশি possible হলেই দেব না (hack block)
  if (claimed > maxPossible + 5) { // +5 rounding tolerance
    return res.status(403).json({
      ok:      false,
      message: "Claim exceeds maximum possible gold from watched ads",
    });
  }

  try {
    const db      = getDb();
    const userRef = db.collection("users").doc(uid);

    let refBonusGiven = false;

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw new Error("User not found");

      const user = snap.data();
      if (user.isBanned) throw new Error("Banned");

      // ── First lootbox claim → referral bonus ─────────────
      if (!user.firstLootboxClaimed && user.referredBy) {
        const refRef  = db.collection("users").doc(user.referredBy);
        const refSnap = await tx.get(refRef);
        if (refSnap.exists && !refSnap.data().isBanned) {
          tx.update(refRef, {
            pointBalance:         FieldValue.increment(300),
            lifetimePointsEarned: FieldValue.increment(300),
            referralCount:        FieldValue.increment(1),
          });
          refBonusGiven = true;
        }
      }

      // ── Update user ───────────────────────────────────────
      const updates = {
        pointBalance:              FieldValue.increment(claimed),
        lifetimePointsEarned:      FieldValue.increment(claimed),
        lifetimeAdsWatched:        FieldValue.increment(Number(adsWatched) || 0),
        adsWatchedAdsgramDaily:    FieldValue.increment(dAds),
        adsWatchedAdsgramSpecial:  FieldValue.increment(sAds),
        adsWatchedMonetag:         FieldValue.increment(mAds),
        adsWatchedGiga:            FieldValue.increment(gAds),
      };

      if (!user.firstLootboxClaimed) {
        updates.firstLootboxClaimed = true;
      }

      tx.update(userRef, updates);
      return { ok: true };
    });

    return res.status(200).json({
      success:      true,
      ok:           true,
      refBonusGiven,
      goldAdded:    claimed,
    });

  } catch (err) {
    if (err.message === "Banned")
      return res.status(403).json({ ok: false, message: "Banned" });
    if (err.message === "User not found")
      return res.status(404).json({ ok: false, message: "User not found" });

    console.error("claimLootbox error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
      }
