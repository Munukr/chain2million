import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
app.use(express.json());

const botToken = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;

app.post('/api/bot', async (req, res) => {
    const body = req.body;
    // Логируем входящее обновление для отладки
    console.log('Update:', JSON.stringify(body));
    // Проверяем, что это команда /start или /admin
    if (body.message && body.message.text) {
        const chatId = body.message.chat.id;
        const userId = body.message.from.id;
        if (body.message.text.startsWith('/start')) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: 'Welcome to Chain2Million!',
                    reply_markup: {
                        inline_keyboard: [[{
                            text: 'Open WebApp',
                            web_app: { url: webAppUrl }
                        }]]
                    }
                })
            });
        } else if (body.message.text.startsWith('/admin')) {
            if (userId === 795024553) {
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: 'Открыть админку',
                        reply_markup: {
                            inline_keyboard: [[{
                                text: 'Открыть админку',
                                web_app: { url: webAppUrl + '/admin.html' }
                            }]]
                        }
                    })
                });
            } else {
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: 'У вас нет доступа к админке.'
                    })
                });
            }
        }
    }
    res.sendStatus(200);
});

export default app; 