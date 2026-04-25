// api/videoClaim.js
const crypto = require('crypto');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const SECRET_KEY = process.env.API_SECRET || 'newtube-ton-premium-secret-key-2024';

// Firebase Admin init (শুধুমাত্র একবার হবে)
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

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { userId, startTime, signature, claimedPoints } = req.body;

        if (!userId || !startTime || !signature || claimedPoints == null) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // ১. সিগনেচার ভেরিফাই (Hack Check)
        const expectedSignature = crypto.createHmac('sha256', SECRET_KEY)
                                        .update(`${userId}_${startTime}`)
                                        .digest('hex');
                                        
        if (signature !== expectedSignature) {
            return res.status(403).json({ success: false, error: 'Security token mismatch. Refresh app.' });
        }

        // ২. টাইম ভেরিফিকেশন (Speed Hack Check)
        const now = Date.now();
        const elapsedSeconds = (now - startTime) / 1000;
        
        // ফ্রন্টএন্ডে ১৫ সেকেন্ডে ০.১ পয়েন্ট দেয়। (১ পয়েন্ট = ১৫০ সেকেন্ড)
        // ১৫% বাফার টাইম রাখা হয়েছে ল্যাগ/ইন্টারনেট সমস্যার জন্য।
        const maxPossiblePoints = (elapsedSeconds / 150) * 1.15; 

        if (claimedPoints > 26) {
            return res.status(403).json({ success: false, error: 'Exceeded max box limit (25)' });
        }

        if (claimedPoints > maxPossiblePoints && claimedPoints > 0.5) {
            return res.status(403).json({ success: false, error: 'Speed hack detected. Too fast.' });
        }

        // ৩. ফায়ারবেস আপডেট
        const userRef = db.collection('users').doc(String(userId));
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const userData = userSnap.data();

        if (userData.isBanned) {
            return res.status(403).json({ success: false, error: 'Account is banned' });
        }

        const dailyMined = userData.dailyVideoMined || 0;
        if (dailyMined + claimedPoints > 250) {
            return res.status(403).json({ success: false, error: 'Daily limit reached' });
        }

        // ফায়ারবেসে পয়েন্ট যোগ করা
        await userRef.update({
            pointBalance: FieldValue.increment(claimedPoints),
            lifetimePointsEarned: FieldValue.increment(claimedPoints),
            dailyVideoMined: FieldValue.increment(claimedPoints)
        });

        // ৪. সফল রেসপন্স
        return res.status(200).json({ 
            success: true, 
            pointsAdded: claimedPoints 
        });

    } catch (err) {
        console.error('videoClaim API error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
};
