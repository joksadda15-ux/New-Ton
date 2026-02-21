export default async function handler(req, res) {
  // CORS Headers added to fix Web App blocking issue
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Telegram Web App requires this
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const TOKEN = process.env.BOT_TOKEN;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "User ID missing" });
  }

  const CHANNEL = "@NEEWTON_OFFICIAL";
  const GROUP = "@newTon_Gc";

  async function check(chat) {
    try {
        const response = await fetch(
          `https://api.telegram.org/bot${TOKEN}/getChatMember?chat_id=${chat}&user_id=${userId}`
        );

        const data = await response.json();

        if (!data.ok || !data.result) return false;

        const status = data.result.status;
        return status !== "left" && status !== "kicked";
    } catch (e) {
        return false;
    }
  }

  try {
    const inChannel = await check(CHANNEL);
    const inGroup = await check(GROUP);

    return res.status(200).json({
      channel: inChannel,
      group: inGroup,
      success: inChannel && inGroup
    });

  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
}
