export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const TOKEN = process.env.BOT_TOKEN;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const CHANNEL = "@NEEWTON_OFFICIAL";
  const GROUP = "@newTon_Gc";

  async function check(chat) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TOKEN}/getChatMember?chat_id=${chat}&user_id=${userId}`
      );
      const data = await response.json();

      if (!data.ok) {
        return false;
      }

      const status = data.result.status;
      return ["member", "administrator", "creator"].includes(status);

    } catch (e) {
      return false;
    }
  }

  const channel = await check(CHANNEL);
  const group = await check(GROUP);

  return res.status(200).json({
    joined: channel && group
  });
}
