// api/claimLootbox.js
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

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

// রেফারাল বোনাস
const REFERRAL_REWARD_POINTS = 300;

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

    try {
        const { 
            userId, points, adsWatched, 
            adsWatchedAdsgramDaily, adsWatchedAdsgramSpecial, 
            adsWatchedMonetag, adsWatchedGiga 
        } = req.body;

        if (!userId || typeof points !== 'number' || points < 200) {
            return res.status(400).json({ success: false, message: 'Invalid data or points too low.' });
        }

        if (points > 550) {
            return res.status(400).json({ success: false, message: 'Security Error: Invalid Lootbox Data.' });
        }

        // হ্যাকিং চেক (প্রতি অ্যাডে ম্যাক্সিমাম ২০ পয়েন্ট ধরা হয়েছে)
        const minExpectedAds = Math.floor(points / 20);
        if (adsWatched < minExpectedAds) {
            return res.status(400).json({ success: false, message: 'Points/ads ratio is suspicious. Hack attempt blocked.' });
        }

        const userRef = db.collection('users').doc(String(userId));
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const userData = userSnap.data();
        if (userData.isBanned) {
            return res.status(403).json({ success: false, message: 'Account is banned.' });
        }

        const oldAdsCount = userData.lifetimeAdsWatched || 0;
        const newAdsCount = oldAdsCount + adsWatched;

        // আপডেট অবজেক্ট তৈরি
        const updates = {
            pointBalance: FieldValue.increment(points),
            lifetimePointsEarned: FieldValue.increment(points),
            lifetimeAdsWatched: FieldValue.increment(adsWatched),
        };

        if (adsWatchedAdsgramDaily > 0) updates.adsWatchedAdsgramDaily = FieldValue.increment(adsWatchedAdsgramDaily);
        if (adsWatchedAdsgramSpecial > 0) updates.adsWatchedAdsgramSpecial = FieldValue.increment(adsWatchedAdsgramSpecial);
        if (adsWatchedMonetag > 0) updates.adsWatchedMonetag = FieldValue.increment(adsWatchedMonetag);
        if (adsWatchedGiga > 0) updates.adsWatchedGiga = FieldValue.increment(adsWatchedGiga);

        // ডাটাবেসে সেভ করা
        await userRef.update(updates);

        // রেফারাল বোনাস লজিক (যদি আগে ১০টা অ্যাড না দেখে থাকে, এবং এখন ১০ পার করে)
        let refBonusGiven = false;
        if (oldAdsCount < 10 && newAdsCount >= 10 && userData.referredBy) {
            const refRef = db.collection('users').doc(String(userData.referredBy));
            const refSnap = await refRef.get();
            
            if (refSnap.exists) {
                await refRef.update({
                    pointBalance: FieldValue.increment(REFERRAL_REWARD_POINTS),
                    lifetimePointsEarned: FieldValue.increment(REFERRAL_REWARD_POINTS),
                    referralCount: FieldValue.increment(1)
                });
                
                await db.collection('transactions').add({
                    userId: userData.referredBy,
                    type: 'Referral Reward',
                    details: `Valid Ref UID: ${userId}`,
                    pointAmount: REFERRAL_REWARD_POINTS,
                    createdAt: FieldValue.serverTimestamp()
                });
                refBonusGiven = true;
            }
        }

        return res.status(200).json({ 
            success: true, 
            pointsAdded: points,
            refBonusGiven: refBonusGiven
        });

    } catch (err) {
        console.error('claimLootbox API error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};
