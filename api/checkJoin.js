export default async function handler(req, res) {

  const TOKEN = process.env.BOT_TOKEN;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "No userId" });
  }

  const CHANNEL = "@NEEWTON_OFFICIAL";
  const GROUP = "@newTon_Gc";

  async function check(chat) {
    const response = await fetch(
      `https://api.telegram.org/bot${TOKEN}/getChatMember?chat_id=${chat}&user_id=${userId}`
    );

    const data = await response.json();

    if (!data.ok) return false;

    const status = data.result.status;

    return (
      status === "member" ||
      status === "administrator" ||
      status === "creator"
    );
  }

  try {

    const inChannel = await check(CHANNEL);
    const inGroup = await check(GROUP);

    if (inChannel && inGroup) {
      return res.status(200).json({ joined: true });
    }

    return res.status(200).json({ joined: false });

  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
}
