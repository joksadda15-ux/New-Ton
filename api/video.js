const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin Initialization (আপনার ফায়ারবেসের সার্ভিস অ্যাকাউন্ট কি লাগবে)
// Vercel Environment Variable এ FIREBASE_SERVICE_ACCOUNT নামে JSON টি রাখতে হবে
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.log("Firebase Admin Not Initialized. Add FIREBASE_SERVICE_ACCOUNT in Vercel.");
    }
}

const db = admin.firestore();
const SECRET_KEY = process.env.SECRET_KEY || "NEWTUBE_SUPER_SECRET_KEY_2024"; 

// ==========================================
// 1. START VIDEO MINING API
// ==========================================
// ফ্রন্টএন্ড থেকে ভিডিও প্লে করলে এই API কল হবে
app.post('/api/video/start', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const startTime = Date.now();
    
    // একটি সিকিউর হ্যাশ তৈরি করা হচ্ছে (যা হ্যাকাররা বানাতে পারবে না)
    const signature = crypto.createHmac('sha256', SECRET_KEY)
                            .update(`${userId}:${startTime}`)
                            .digest('hex');

    res.json({
        success: true,
        startTime: startTime,
        signature: signature
    });
});

// ==========================================
// 2. CLAIM VIDEO POINTS API
// ==========================================
// ফ্রন্টএন্ড থেকে অ্যাড দেখার পর Claim বাটনে ক্লিক করলে এই API কল হবে
app.post('/api/video/claim', async (req, res) => {
    const { userId, startTime, signature, claimedPoints } = req.body;

    if (!userId || !startTime || !signature || claimedPoints === undefined) {
        return res.status(400).json({ error: "Missing data" });
    }

    // ১. সিগনেচার ভেরিফিকেশন (হ্যাকার নিজে ডাটা বানালে ধরা খাবে)
    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY)
                                    .update(`${userId}:${startTime}`)
                                    .digest('hex');

    if (signature !== expectedSignature) {
        return res.status(403).json({ error: "Hacking Attempt Detected! Invalid Signature." });
    }

    // ২. টাইম ক্যালকুলেশন (সত্যিই কি অতক্ষণ ভিডিও দেখেছে?)
    const currentTime = Date.now();
    const timeWatchedMs = currentTime - startTime;
    const timeWatchedSeconds = Math.floor(timeWatchedMs / 1000);

    // রুলস: প্রতি ১৫ সেকেন্ডে ০.১ পয়েন্ট। তার মানে ১ সেকেন্ডে (0.1 / 15) পয়েন্ট।
    const maxPossiblePoints = (timeWatchedSeconds / 15) * 0.1;
    
    // বাফারের জন্য ১-২ পয়েন্ট ছাড় দেওয়া হলো (ইন্টারনেট স্লো হলে টাইম এদিক সেদিক হতে পারে)
    const allowedPoints = maxPossiblePoints + 1.0; 

    if (claimedPoints > allowedPoints) {
        return res.status(403).json({ 
            error: "Speed Hack Detected!",
            message: `You watched for ${timeWatchedSeconds}s, max allowed is ${maxPossiblePoints.toFixed(2)} pts.`
        });
    }

    // ৩. সেফটি চেক: ম্যাক্সিমাম ২৫ পয়েন্টের বেশি একবারে ক্লেইম করা যাবে না
    let finalPoints = parseFloat(claimedPoints);
    if (finalPoints > 25) finalPoints = 25;

    // ৪. ফায়ারবেসে পয়েন্ট আপডেট (Backend to Firebase - 100% Secure)
    try {
        const userRef = db.collection('users').doc(userId.toString());
        const userSnap = await userRef.get();

        if (!userSnap.exists) return res.status(404).json({ error: "User not found" });

        const userData = userSnap.data();
        const currentDailyMined = userData.dailyVideoMined || 0;

        // ডেইলি লিমিট ২৫০ চেক
        if (currentDailyMined + finalPoints > 250) {
            finalPoints = 250 - currentDailyMined;
            if (finalPoints <= 0) {
                return res.status(400).json({ error: "Daily limit of 250 points reached." });
            }
        }

        // Firebase-এ ডাটা আপডেট
        await userRef.update({
            pointBalance: admin.firestore.FieldValue.increment(finalPoints),
            lifetimePointsEarned: admin.firestore.FieldValue.increment(finalPoints),
            dailyVideoMined: admin.firestore.FieldValue.increment(finalPoints)
        });

        res.json({
            success: true,
            message: `Successfully mined ${finalPoints} Points!`,
            pointsAdded: finalPoints
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error saving data." });
    }
});

module.exports = app;
