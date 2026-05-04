const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
    });
}
const db = admin.firestore();

function getTodayDateString() {
    return new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' });
}

module.exports = async (req, res) => {
    // CORS Setup
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { userId, username, referrerCode } = req.body;
        if (!userId) return res.status(400).json({ error: "User ID missing" });

        const userRef = db.collection('users').doc(String(userId));
        const userSnap = await userRef.get();
        const today = getTodayDateString();

        if (!userSnap.exists) {
            const newUser = {
                pointBalance: 0, diamondBalance: 0, lifetimePointsEarned: 0, referralCount: 0, totalInvites: 0, spentReferrals: 0, completedTasks:
