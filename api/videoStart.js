const crypto = require('crypto');
const SECRET_KEY = process.env.SECRET_KEY || "NEWTUBE_SUPER_SECRET_KEY_2024";

module.exports = (req, res) => {
    // CORS Headers (যাতে আপনার অ্যাপ থেকে রিকোয়েস্ট এক্সেপ্ট করে)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const startTime = Date.now();
    
    // সিকিউর হ্যাশ (Signature) তৈরি
    const signature = crypto.createHmac('sha256', SECRET_KEY)
                            .update(`${userId}:${startTime}`)
                            .digest('hex');

    res.status(200).json({
        success: true,
        startTime: startTime,
        signature: signature
    });
};
