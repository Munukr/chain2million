const TelegramBot = require('node-telegram-bot-api');

// Создаем экземпляр бота для использования в API
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: false
});

module.exports = bot; 