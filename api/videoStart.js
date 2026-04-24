
// api/video.js
// GitHub: New-Ton/api/video.js
// Deploy: https://new-ton-755t.vercel.app/api/video
//
// Admin panel à¦¥à§‡à¦•à§‡ Firebase 'videos' collection à¦ video add à¦•à¦°à¦²à§‡
// à¦à¦‡ API à¦¸à§‡à¦—à§à¦²à§‹ serve à¦•à¦°à¦¬à§‡à¥¤
// Firebase Free Plan (Spark) safe - à¦¶à§à¦§à§ read à¦•à¦°à§‡, write à¦¨à§‡à¦‡à¥¤

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Firebase Admin init (à¦à¦•à¦¬à¦¾à¦°à¦‡ à¦¹à¦¬à§‡)
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
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'public, s-maxage=60'); // 60 seconds cache

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const snap = await db.collection('videos')
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(30)
            .get();

        if (snap.empty) {
            return res.status(200).json([]);
        }

        const videos = [];
        snap.forEach(doc => {
            const d = doc.data();
            videos.push({
                id: doc.id,
                videoId: d.videoId,   // YouTube Video ID
                title: d.title,
                isActive: d.isActive,
            });
        });

        return res.status(200).json(videos);
    } catch (err) {
        console.error('video API error:', err);
        return res.status(500).json({ error: 'Failed to fetch videos' });
    }
};
