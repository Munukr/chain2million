import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
const botToken = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;
const webhookPath = '/api/bot';
const webhookUrl = `${webAppUrl.replace(/\/$/, '')}${webhookPath}`;

app.use(express.json());
app.use(express.static('public'));

const bot = new TelegramBot(botToken, { webHook: true });
bot.setWebHook(webhookUrl);

app.post(webhookPath, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome to Chain2Million!', {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: 'Open WebApp',
                    web_app: { url: webAppUrl }
                }]
            ]
        }
    });
});

export default app; 