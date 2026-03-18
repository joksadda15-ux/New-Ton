export default async function handler(req, res) {

  const { userId, channel } = req.query;
  const BOT_TOKEN = process.env.BOT_TOKEN;

  if (!userId || !channel) {
    return res.json({ joined: false });
  }

  try {

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${channel}&user_id=${userId}`
    );

    const data = await response.json();

    if (!data.ok) {
      return res.json({ joined: false });
    }

    const status = data.result.status;

    const joined =
      status === "member" ||
      status === "administrator" ||
      status === "creator";

    res.json({ joined });

  } catch (error) {
    res.json({ joined: false });
  }

}
