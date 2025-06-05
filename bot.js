// Обработка команды /start
bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const code = match[1];

    try {
        // Проверяем, существует ли пользователь
        const userRef = db.collection('users').doc(chatId.toString());
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            await bot.sendMessage(chatId, 'Вы уже зарегистрированы!');
            return;
        }

        let invitedBy = '795024553'; // По умолчанию админ

        // Проверяем тип кода
        if (code.startsWith('ref_')) {
            // Реферальный код
            const referrerId = code.replace('ref_', '');
            invitedBy = referrerId;
        } else if (code.startsWith('free_')) {
            // Проверяем одноразовый код
            const freeCode = code.replace('free_', '');
            const response = await fetch('http://localhost:3000/api/admin/checkCode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: freeCode })
            });

            const data = await response.json();
            if (!data.success) {
                await bot.sendMessage(chatId, 'Недействительный или уже использованный код!');
                return;
            }
            invitedBy = data.invitedBy;
        }

        // Создаем пользователя
        await userRef.set({
            access: 'paid',
            points: 0,
            invitedBy: invitedBy,
            invitedUsers: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Добавляем пользователя в список приглашенных
        if (invitedBy !== '795024553') {
            const referrerRef = db.collection('users').doc(invitedBy);
            await referrerRef.update({
                invitedUsers: admin.firestore.FieldValue.arrayUnion(chatId.toString())
            });
        }

        // Запускаем распределение бонусов
        await distributeReferralBonus(chatId.toString());

        await bot.sendMessage(chatId, 'Добро пожаловать! Ваш доступ активирован.');
    } catch (error) {
        console.error('Start command error:', error);
        await bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
    }
}); 