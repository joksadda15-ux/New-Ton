// api/claimLootbox.js
// GitHub: New-Ton/api/claimLootbox.js
// Deploy: https://new-ton-755t.vercel.app/api/claimLootbox
//
// Lootbox claim à¦à¦° à¦†à¦—à§‡ server-side verify à¦•à¦°à§‡ hack à¦¥à§‡à¦•à§‡ à¦¬à¦¾à¦à¦šà¦¾à¦¯à¦¼à¥¤
// Firebase Free Plan safe - à¦¶à§à¦§à§ read à¦•à¦°à§‡à¥¤

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = getFirestore();

// Max possible points per ad type per day
const MAX_DAILY_POINTS = {
    adsgramDaily: 15 * 15,   // 15 ads Ã— max 15pts = 225
    adsgramSpecial: 5 * 25,  // 5 ads Ã— max 25pts = 125
    monetag: 10 * 18,        // 10 ads Ã— max 18pts = 180
    giga: 10 * 18            // 10 ads Ã— max 18pts = 180
};
const ABSOLUTE_MAX = 550; // max lootbox capacity

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed' });

    try {
        const { userId, points, adsWatched } = req.body;

        if (!userId || typeof points !== 'number' || points < 200) {
            return res.status(400).json({ ok: false, message: 'Invalid request data.' });
        }

        // Hard limit check
        if (points > ABSOLUTE_MAX) {
            return res.status(400).json({ ok: false, message: 'Points exceed maximum capacity.' });
        }

        // Sanity check: minimum ads needed to earn points
        // (min 8pts per ad, so points / 18 is rough min ads needed)
        const minAdsNeeded = Math.floor(points / 18);
        if (adsWatched < minAdsNeeded) {
            return res.status(400).json({ ok: false, message: 'Points/ads ratio is suspicious.' });
        }

        // Check user exists in Firebase
        const userRef = db.collection('users').doc(String(userId));
        const userSnap = await userRef.get();
        if (!userSnap.exists()) {
            return res.status(404).json({ ok: false, message: 'User not found.' });
        }

        const user = userSnap.data();
        if (user.isBanned) {
            return res.status(403).json({ ok: false, message: 'Account is banned.' });
        }

        // All checks passed
        return res.status(200).json({ ok: true, message: 'Verified.' });

    } catch (err) {
        console.error('claimLootbox API error:', err);
        return res.status(500).json({ ok: false, message: 'Server error.' });
    }
};
