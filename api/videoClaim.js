const crypto = require('crypto');
const admin = require('firebase-admin');

// Firebase Admin Setup
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.log("Firebase Admin Not Initialized. Check Environment Variables.");
    }
}
const db = admin.firestore();
const SECRET_KEY = process.env.SECRET_KEY || "NEWTUBE_SUPER_SECRET_KEY_2024";

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { userId, startTime, signature, claimedPoints } = req.body || {};

    if (!userId || !startTime || !signature || claimedPoints === undefined) {
        return res.status(400).json({ error: "Missing data" });
    }

    // ১. Signature Verification (হ্যাকিং চেক)
    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY)
                                    .update(`${userId}:${startTime}`)
                                    .digest('hex');

    if (signature !== expectedSignature) {
        return res.status(403).json({ error: "Hacking Attempt Detected! Invalid Signature." });
    }

    // ২. Time Verification (স্পিড হ্যাক চেক)
    const currentTime = Date.now();
    const timeWatchedSeconds = Math.floor((currentTime - startTime) / 1000);
    const maxPossiblePoints = (timeWatchedSeconds / 15) * 0.1;
    const allowedPoints = maxPossiblePoints + 1.0; // 1 point buffer for internet lag

    if (claimedPoints > allowedPoints) {
        return res.status(403).json({ 
            error: "Speed Hack Detected!",
            message: `Max allowed is ${maxPossiblePoints.toFixed(2)} pts.`
        });
    }

    let finalPoints = parseFloat(claimedPoints);
    if (finalPoints > 25) finalPoints = 25; // ম্যাক্সিমাম ২৫ পয়েন্ট একবারে

    // ৩. Firebase Database Update
    try {
        const userRef = db.collection('users').doc(userId.toString());
        const userSnap = await userRef.get();

        if (!userSnap.exists) return res.status(404).json({ error: "User not found" });

        const currentDailyMined = userSnap.data().dailyVideoMined || 0;
        
        if (currentDailyMined + finalPoints > 250) {
            finalPoints = 250 - currentDailyMined;
            if (finalPoints <= 0) {
                return res.status(400).json({ error: "Daily limit reached." });
            }
        }

        await userRef.update({
            pointBalance: admin.firestore.FieldValue.increment(finalPoints),
            lifetimePointsEarned: admin.firestore.FieldValue.increment(finalPoints),
            dailyVideoMined: admin.firestore.FieldValue.increment(finalPoints)
        });

        res.status(200).json({
            success: true,
            message: `Successfully mined ${finalPoints} Points!`,
            pointsAdded: finalPoints
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};
