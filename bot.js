import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import express from 'express';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static('public'));

// Initialize bot with token
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Command handler for /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const webAppUrl = process.env.WEBAPP_URL;
    
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

// Start Express server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 