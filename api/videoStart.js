// api/videoStart.js
const crypto = require('crypto');

// এটি সিকিউরিটির জন্য। আপনি চাইলে Vercel Environment Variables এ API_SECRET সেট করতে পারেন।
const SECRET_KEY = process.env.API_SECRET || 'newtube-ton-premium-secret-key-2024';

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ success: false, error: 'Missing userId' });
        }

        const startTime = Date.now();
        // সিকিউর সিগনেচার তৈরি (যাতে কেউ ফেক টাইম দিয়ে পয়েন্ট না নিতে পারে)
        const signature = crypto.createHmac('sha256', SECRET_KEY)
                                .update(`${userId}_${startTime}`)
                                .digest('hex');

        return res.status(200).json({ 
            success: true, 
            startTime: startTime, 
            signature: signature 
        });

    } catch (err) {
        console.error('videoStart API error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
};
