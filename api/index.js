const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const admin = require('firebase-admin');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin Setup (Vercel Environment Variable থেকে Data নিবে)
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (error) {
        console.error("Firebase Initialization Error. Please check your FIREBASE_SERVICE_ACCOUNT env variable.");
    }
}

const db = admin.firestore();
const VIDEO_SECRET_KEY = process.env.VIDEO_SECRET_KEY || 'super_secret_video_key_123';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; 

function getTodayDateString() {
    return new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ==========================================
// 1. API: Init User (লগিন ও ডেইলি রিসেট)
// ==========================================
app.post('/api/initUser', async (req, res) => {
    try {
        const { userId, username, referrerCode } = req.body;
        if (!userId) return res.status(400).json({ error: "User ID missing" });

        const userRef = db.collection('users').doc(String(userId));
        const userSnap = await userRef.get();
        const today = getTodayDateString();

        if (!userSnap.exists) {
            const newUser = {
                pointBalance: 0, diamondBalance: 0, lifetimePointsEarned: 0, referralCount: 0, totalInvites: 0, spentReferrals: 0, completedTasks:[],
                createdAt: admin.firestore.FieldValue.serverTimestamp(), telegramUsername: username || 'N/A', isBanned: false, withdrawalCount: 0,
                lifetimeAdsWatched: 0, adsWatchedAdsgramDaily: 0, adsWatchedAdsgramSpecial: 0, adsWatchedMonetag: 0, adsWatchedGiga: 0,
                dailyVideoMined: 0, lastResetDate: today, welcomeBonusClaimed: false
            };

            if (referrerCode && referrerCode !== String(userId)) {
                newUser.referredBy = String(referrerCode);
                await db.collection('users').doc(String(referrerCode)).update({ totalInvites: admin.firestore.FieldValue.increment(1) }).catch(() => {});
            }
            await userRef.set(newUser);
            return res.json({ success: true, user: { id: userId, ...newUser } });
        } else {
            let userData = userSnap.data();
            if (userData.isBanned) return res.status(403).json({ error: "Account Banned" });

            if (userData.lastResetDate !== today) {
                const updates = { adsWatchedAdsgramDaily: 0, adsWatchedAdsgramSpecial: 0, adsWatchedMonetag: 0, adsWatchedGiga: 0, dailyVideoMined: 0, lastResetDate: today };
                await userRef.update(updates);
                userData = { ...userData, ...updates };
            }
            return res.json({ success: true, user: { id: userId, ...userData } });
        }
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// 2. API: Claim Lootbox (অ্যাড এর গোল্ড সেভ করা)
// ==========================================
app.post('/api/claimLootbox', async (req, res) => {
    try {
        const { userId, points, adsWatched, adsWatchedAdsgramDaily, adsWatchedAdsgramSpecial, adsWatchedMonetag, adsWatchedGiga } = req.body;
        
        if (points < 50 || points > 3000) return res.status(400).json({ success: false, message: "Invalid claim amount." });

        const userRef = db.collection('users').doc(String(userId));
        let refBonusGiven = false;

        await db.runTransaction(async (t) => {
            const userSnap = await t.get(userRef);
            if (!userSnap.exists) throw new Error("User not found");
            const userData = userSnap.data();

            let updates = {
                pointBalance: admin.firestore.FieldValue.increment(points),
                lifetimePointsEarned: admin.firestore.FieldValue.increment(points),
                lifetimeAdsWatched: admin.firestore.FieldValue.increment(adsWatched || 0),
                adsWatchedAdsgramDaily: admin.firestore.FieldValue.increment(adsWatchedAdsgramDaily || 0),
                adsWatchedAdsgramSpecial: admin.firestore.FieldValue.increment(adsWatchedAdsgramSpecial || 0),
                adsWatchedMonetag: admin.firestore.FieldValue.increment(adsWatchedMonetag || 0),
                adsWatchedGiga: admin.firestore.FieldValue.increment(adsWatchedGiga || 0),
            };

            // Referral Bonus - 3000 Gold
            if (userData.referredBy && !userData.hasClaimedFirstLootbox) {
                updates.hasClaimedFirstLootbox = true;
                const referrerRef = db.collection('users').doc(userData.referredBy);
                t.update(referrerRef, {
                    referralCount: admin.firestore.FieldValue.increment(1),
                    pointBalance: admin.firestore.FieldValue.increment(3000),
                    lifetimePointsEarned: admin.firestore.FieldValue.increment(3000)
                });
                refBonusGiven = true;
            }
            t.update(userRef, updates);
        });

        res.json({ success: true, pointsAdded: points, refBonusGiven });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ==========================================
// 3. API: Video Start (সিকিউরিটি সিগনেচার)
// ==========================================
app.post('/api/videoStart', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false });

    const startTime = Date.now();
    const signature = crypto.createHmac('sha256', VIDEO_SECRET_KEY).update(`${userId}_${startTime}`).digest('hex');
    res.json({ success: true, startTime, signature });
});

// ==========================================
// 4. API: Video Claim (ভিডিও গোল্ড চেক করে দেওয়া)
// ==========================================
app.post('/api/videoClaim', async (req, res) => {
    try {
        const { userId, startTime, signature, claimedPoints } = req.body;
        
        const expectedSignature = crypto.createHmac('sha256', VIDEO_SECRET_KEY).update(`${userId}_${startTime}`).digest('hex');
        if (signature !== expectedSignature) return res.status(403).json({ success: false, message: "Security token mismatch!" });

        // 200 Gold per hour = ~0.055 Gold per second
        const timeElapsedSeconds = (Date.now() - startTime) / 1000;
        const maxPossiblePoints = timeElapsedSeconds * 0.065; 

        if (claimedPoints > maxPossiblePoints + 15) return res.status(403).json({ success: false, message: "Speed hack detected!" });
        if (claimedPoints > 250) return res.status(400).json({ success: false, message: "Exceeded max box limit." });

        const userRef = db.collection('users').doc(String(userId));
        await db.runTransaction(async (t) => {
            const snap = await t.get(userRef);
            if ((snap.data().dailyVideoMined || 0) + claimedPoints > 4800) throw new Error("Daily video limit (4800) reached.");

            t.update(userRef, {
                pointBalance: admin.firestore.FieldValue.increment(claimedPoints),
                lifetimePointsEarned: admin.firestore.FieldValue.increment(claimedPoints),
                dailyVideoMined: admin.firestore.FieldValue.increment(claimedPoints)
            });
        });

        res.json({ success: true, pointsAdded: claimedPoints });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ==========================================
// 5. API: Exchange Gold to Diamond
// ==========================================
app.post('/api/exchangeGold', async (req, res) => {
    try {
        const { userId, goldAmount } = req.body;
        if (!goldAmount || goldAmount < 5000 || goldAmount > 100000 || goldAmount % 1000 !== 0) throw new Error("Invalid gold amount.");

        const diamondGain = Math.floor(goldAmount / 1000);
        const userRef = db.collection('users').doc(String(userId));

        await db.runTransaction(async (t) => {
            const docSnap = await t.get(userRef);
            if ((docSnap.data().pointBalance || 0) < goldAmount) throw new Error("Insufficient Gold.");
            
            t.update(userRef, {
                pointBalance: admin.firestore.FieldValue.increment(-goldAmount),
                diamondBalance: admin.firestore.FieldValue.increment(diamondGain)
            });
        });
        res.json({ success: true, diamondGain });
    } catch (error) { res.status(400).json({ success: false, message: error.message }); }
});

// ==========================================
// 6. API: Withdraw (ডায়মন্ড উইথড্র করা)
// ==========================================
app.post('/api/withdraw', async (req, res) => {
    try {
        const { userId, amount, details } = req.body; // amount in diamonds
        if (!amount || amount < 1000 || !details) throw new Error("Invalid request");

        const today = getTodayDateString();
        const walletCheck = await db.collection('withdrawals').where('details', '==', details).limit(5).get();
        let usedByOther = false;
        walletCheck.forEach(doc => { if (doc.data().userId !== String(userId)) usedByOther = true; });
        if (usedByOther) throw new Error("This Tonkeeper address is already used by another account!");

        const userRef = db.collection('users').doc(String(userId));

        await db.runTransaction(async (t) => {
            const userSnap = await t.get(userRef);
            const data = userSnap.data();

            if (data.lastWithdrawDate === today) throw new Error("You can only withdraw once per day.");
            if ((data.diamondBalance || 0) < amount) throw new Error("Insufficient Diamonds.");

            const refsNeeded = Math.ceil(amount / 1000);
            const refsAvail = (data.referralCount || 0) - (data.spentReferrals || 0);
            if (refsAvail < refsNeeded) throw new Error(`Need ${refsNeeded} Valid Refs.`);

            t.update(userRef, {
                diamondBalance: admin.firestore.FieldValue.increment(-amount),
                withdrawalCount: admin.firestore.FieldValue.increment(1),
                lastWithdrawDate: today,
                spentReferrals: admin.firestore.FieldValue.increment(refsNeeded)
            });

            const newWithdrawRef = db.collection('withdrawals').doc();
            t.set(newWithdrawRef, {
                userId: String(userId),
                method: 'Tonkeeper',
                details: details,
                status: 'pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                diamondAmount: amount,
                tonAmount: (amount / 1000) * 0.75,
                dollarAmount: amount / 1000,
                refsUsed: refsNeeded
            });
        });
        res.json({ success: true, message: "Withdrawal successful!" });
    } catch (error) { res.status(400).json({ success: false, message: error.message }); }
});

// ==========================================
// 7. API: Complete Task
// ==========================================
app.post('/api/completeTask', async (req, res) => {
    try {
        const { userId, taskId } = req.body;
        const reward = 120; // Task reward in Gold

        await db.runTransaction(async (t) => {
            const userRef = db.collection('users').doc(String(userId));
            const uSnap = await t.get(userRef);
            if (uSnap.data().completedTasks && uSnap.data().completedTasks.includes(taskId)) throw new Error("Task already completed.");

            t.update(userRef, {
                completedTasks: admin.firestore.FieldValue.arrayUnion(taskId),
                pointBalance: admin.firestore.FieldValue.increment(reward),
                lifetimePointsEarned: admin.firestore.FieldValue.increment(reward)
            });
            t.update(db.collection('tasks').doc(taskId), { completionCount: admin.firestore.FieldValue.increment(1) });
        });
        res.json({ success: true, reward });
    } catch (error) { res.status(400).json({ success: false, message: error.message }); }
});

// ==========================================
// 8. API: Promo Code
// ==========================================
app.post('/api/claimPromo', async (req, res) => {
    try {
        const { userId, code } = req.body;
        let rewardAmount = 0;
        await db.runTransaction(async (t) => {
            const promoRef = db.collection('promo_codes').doc(code);
            const pSnap = await t.get(promoRef);
            if (!pSnap.exists) throw new Error("Invalid promo code.");
            
            const pData = pSnap.data();
            if (!pData.isActive || pData.currentUses >= pData.maxUses) throw new Error("Code expired.");
            if (pData.usersClaimed && pData.usersClaimed.includes(userId)) throw new Error("You already used this code.");

            rewardAmount = pData.rewardAmount;
            t.update(promoRef, { currentUses: admin.firestore.FieldValue.increment(1), usersClaimed: admin.firestore.FieldValue.arrayUnion(userId) });
            t.update(db.collection('users').doc(String(userId)), { pointBalance: admin.firestore.FieldValue.increment(rewardAmount), lifetimePointsEarned: admin.firestore.FieldValue.increment(rewardAmount) });
        });
        res.json({ success: true, reward: rewardAmount });
    } catch (error) { res.status(400).json({ success: false, message: error.message }); }
});

// ==========================================
// 9. API: Telegram Check Join
// ==========================================
app.get('/api/checkJoin', async (req, res) => {
    try {
        const { userId, channel = '@NEEWTON_OFFICIAL' } = req.query; // ডিফল্ট আপনার চ্যানেল
        const tgRes = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${channel}&user_id=${userId}`);
        const status = tgRes.data.result.status;
        const joined =['creator', 'administrator', 'member'].includes(status);
        res.json({ success: true, joined });
    } catch (error) { res.json({ success: true, joined: false }); }
});

module.exports = app;
