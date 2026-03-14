export default async function handler(req, res) {

const TOKEN = process.env.BOT_TOKEN;
const { userId, channel } = req.query;

try{

const response = await fetch(
`https://api.telegram.org/bot${TOKEN}/getChatMember?chat_id=${channel}&user_id=${userId}`
);

const data = await response.json();

const status = data.result.status;

const joined =
status === "member" ||
status === "administrator" ||
status === "creator";

res.status(200).json({ joined });

}catch(e){

res.status(200).json({ joined:false });

}

}
