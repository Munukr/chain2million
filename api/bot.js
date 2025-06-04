import dotenv from 'dotenv';
import express from 'express';
import admin from 'firebase-admin';

dotenv.config();

const app = express();
app.use(express.json());

const botToken = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;

if (!admin.apps?.length) {
    admin.initializeApp();
}
const db = admin.firestore();

app.post('/api/bot', async (req, res) => {
    const body = req.body;
    // Логируем входящее обновление для отладки
    console.log('Update:', JSON.stringify(body));
    // Проверяем, что это команда /start или /admin
    if (body.message && body.message.text) {
        const chatId = body.message.chat.id;
        const userId = body.message.from.id;
        if (body.message.text.startsWith('/start')) {
            // Проверяем, есть ли реферальный параметр
            let invitedBy = null;
            const parts = body.message.text.split(' ');
            if (parts.length > 1 && parts[1].startsWith('ref_')) {
                invitedBy = parts[1].replace('ref_', '');
            }
            // Проверяем, есть ли пользователь в базе
            const userRef = db.collection('users').doc(userId.toString());
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                // Новый пользователь
                await userRef.set({
                    id: userId.toString(),
                    username: body.message.from.username || '',
                    first_name: body.message.from.first_name || '',
                    access: 'free',
                    points: 0,
                    level: 'bronze',
                    joinedAt: new Date().toISOString(),
                    invitedBy: invitedBy || null
                });
                // Если есть пригласивший — начисляем ему points
                if (invitedBy) {
                    const inviterRef = db.collection('users').doc(invitedBy);
                    const inviterDoc = await inviterRef.get();
                    if (inviterDoc.exists) {
                        const inviterPoints = inviterDoc.data().points || 0;
                        await inviterRef.update({ points: inviterPoints + 1 });
                    }
                }
            }
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