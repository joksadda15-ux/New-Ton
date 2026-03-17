// api/taskVerify.js (বা আলাদা checkMember.js)
export default async function handler(req, res) {
  const { userId, channel } = req.query;
  
  const BOT_TOKEN = process.env.BOT_TOKEN;
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${channel}&user_id=${userId}`
    );
    const data = await response.json();
    const status = data.result?.status;
    const joined = ['member','administrator','creator'].includes(status);
    
    res.json({ joined });
  } catch(e) {
    res.json({ joined: false });
  }
}
