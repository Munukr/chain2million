const fetch = require('node-fetch');
const admin = require('./firebase');
const db = admin.firestore();
const botToken = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;

async function processUpdate(update) {
  try {
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      console.log('[BOT] update received', { chatId, text });
      if (text.startsWith('/start')) {
        // Проверяем, существует ли пользователь
        const userRef = db.collection('users').doc(chatId.toString());
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          await sendMessage(chatId, 'Вы уже зарегистрированы!', {
            reply_markup: {
              inline_keyboard: [[
                { text: 'Открыть WebApp', web_app: { url: webAppUrl } }
              ]]
            }
          });
          return;
        }
        let invitedBy = '795024553';
        // Можно добавить обработку реферальных/одноразовых кодов
        await userRef.set({
          access: 'paid',
          points: 0,
          invitedBy: invitedBy,
          invitedUsers: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await sendMessage(chatId, 'Добро пожаловать! Ваш доступ активирован.', {
          reply_markup: {
            inline_keyboard: [[
              { text: 'Открыть WebApp', web_app: { url: webAppUrl } }
            ]]
          }
        });
      }
    }
  } catch (error) {
    console.error('Webhook error:', error);
  }
}

async function sendMessage(chatId, text, extra = {}) {
  try {
    console.log('[BOT] sendMessage to', chatId, 'text:', text, 'extra:', extra);
    const payload = { chat_id: chatId, text, ...extra };
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const respText = await resp.text();
    console.log('[BOT] sendMessage response:', respText);
  } catch (err) {
    console.error('[BOT] sendMessage error', err);
  }
}

module.exports = { processUpdate }; 