import dotenv from 'dotenv';
import express from 'express';
import admin from 'firebase-admin';

dotenv.config();

const app = express();
app.use(express.json());

const botToken = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;

let adminConfig = {};
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    adminConfig.credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
}
if (!admin.apps?.length) {
    admin.initializeApp(adminConfig);
}
const db = admin.firestore();

app.post('/api/bot', async (req, res) => {
    const body = req.body;
    console.log('Update:', JSON.stringify(body));
    try {
        if (body.message && body.message.text) {
            const chatId = body.message.chat.id;
            const userId = body.message.from.id;
            console.log('Получено сообщение:', body.message.text);
            if (body.message.text.startsWith('/start')) {
                console.log('Обработка /start');
                let invitedBy = null;
                const parts = body.message.text.split(' ');
                if (parts.length > 1 && parts[1].startsWith('ref_')) {
                    invitedBy = parts[1].replace('ref_', '');
                    console.log('Реферальный старт, invitedBy:', invitedBy);
                }
                const userRef = db.collection('users').doc(userId.toString());
                const userDoc = await userRef.get();
                if (!userDoc.exists) {
                    console.log('Новый пользователь, создаём...');
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
                    if (invitedBy) {
                        const inviterRef = db.collection('users').doc(invitedBy);
                        const inviterDoc = await inviterRef.get();
                        if (inviterDoc.exists) {
                            const inviterPoints = inviterDoc.data().points || 0;
                            await inviterRef.update({ points: inviterPoints + 1 });
                            console.log('Начислен point пригласившему:', invitedBy);
                        } else {
                            console.log('Пригласивший не найден:', invitedBy);
                        }
                    }
                } else {
                    console.log('Пользователь уже существует:', userId);
                }
                // Отправляем приветствие
                const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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
                console.log('Ответ отправлен через Telegram API:', await resp.text());
            } else if (body.message.text.startsWith('/admin')) {
                console.log('Обработка /admin');
                if (userId === 795024553) {
                    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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
                    console.log('Ответ отправлен (админка):', await resp.text());
                } else {
                    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: 'У вас нет доступа к админке.'
                        })
                    });
                    console.log('Ответ отправлен (нет доступа):', await resp.text());
                }
            }
        } else {
            console.log('Нет текста сообщения или message');
        }
        res.sendStatus(200);
    } catch (e) {
        console.error('Ошибка в обработке /api/bot:', e);
        res.sendStatus(500);
    }
});

export default app; 