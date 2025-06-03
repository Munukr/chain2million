import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import express from 'express';

// Load environment variables
dotenv.config();

const app = express();
const botToken = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;
const webhookPath = `/bot${botToken}`;
const webhookUrl = `${webAppUrl.replace(/\/$/, '')}${webhookPath}`;

app.use(express.json());
app.use(express.static('public'));

// Инициализация бота в режиме webhook
const bot = new TelegramBot(botToken, { webHook: true });

// Устанавливаем webhook
bot.setWebHook(webhookUrl);

// Обработка входящих обновлений от Telegram
app.post(webhookPath, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Команда /start
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

// Не запускаем app.listen! Для Vercel:
export default app; 