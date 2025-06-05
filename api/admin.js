const express = require('express');
const router = express.Router();
const admin = require('../firebase');
const db = admin.firestore();
const crypto = require('crypto');
const bot = require('../utils/bot');

// Middleware для проверки авторизации админа
const isAdmin = async (req, res, next) => {
    const userId = req.body.userId;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        if (userData.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        next();
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Установка статуса paid для пользователя
router.post('/setPaid', isAdmin, async (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId) {
        return res.status(400).json({ error: 'Target User ID is required' });
    }

    try {
        const userRef = db.collection('users').doc(targetUserId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        if (userData.access === 'paid') {
            return res.status(400).json({ error: 'User already has paid access' });
        }

        await userRef.update({ access: 'paid' });
        
        // Запускаем распределение бонусов
        const distributeReferralBonus = require('../utils/referralBonus');
        await distributeReferralBonus(targetUserId);

        res.json({ success: true, message: 'User access set to paid' });
    } catch (error) {
        console.error('Set paid error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение информации о пользователе
router.post('/getUser', isAdmin, async (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId) {
        return res.status(400).json({ error: 'Target User ID is required' });
    }

    try {
        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        res.json({
            userId: targetUserId,
            access: userData.access,
            points: userData.points,
            invitedBy: userData.invitedBy,
            invitedUsers: userData.invitedUsers || []
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Генерация бесплатной ссылки
router.post('/genFreeLink', isAdmin, async (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId) {
        return res.status(400).json({ error: 'Target User ID is required' });
    }

    try {
        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const freeLink = `/start free_${targetUserId}`;
        res.json({
            success: true,
            freeLink: freeLink
        });
    } catch (error) {
        console.error('Generate free link error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Генерация одноразового кода
router.post('/genOneTimeCode', isAdmin, async (req, res) => {
    try {
        // Генерируем случайный код
        const code = crypto.randomBytes(4).toString('hex');
        
        // Создаем запись в базе
        await db.collection('codes').doc(code).set({
            type: 'free',
            used: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            invitedBy: '795024553' // ID админа
        });

        res.json({
            success: true,
            code: code
        });
    } catch (error) {
        console.error('Generate one-time code error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Проверка и использование кода
router.post('/checkCode', async (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'Code is required' });
    }

    try {
        const codeRef = db.collection('codes').doc(code);
        const codeDoc = await codeRef.get();

        if (!codeDoc.exists) {
            return res.status(404).json({ error: 'Invalid code' });
        }

        const codeData = codeDoc.data();
        if (codeData.used) {
            return res.status(400).json({ error: 'Code already used' });
        }

        // Помечаем код как использованный
        await codeRef.update({ used: true });

        res.json({
            success: true,
            invitedBy: codeData.invitedBy
        });
    } catch (error) {
        console.error('Check code error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение списка кодов
router.post('/getCodes', isAdmin, async (req, res) => {
    try {
        const codesSnapshot = await db.collection('codes')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const codes = [];
        codesSnapshot.forEach(doc => {
            const data = doc.data();
            codes.push({
                code: doc.id,
                used: data.used,
                createdAt: data.createdAt?.toDate() || new Date(),
                type: data.type
            });
        });

        res.json({
            success: true,
            codes: codes
        });
    } catch (error) {
        console.error('Get codes error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение списка пользователей
router.post('/getUsers', isAdmin, async (req, res) => {
    try {
        const { sortBy = 'createdAt', sortDirection = 'desc' } = req.body;
        let query = db.collection('users');

        // Применяем сортировку
        query = query.orderBy(sortBy, sortDirection);

        const usersSnapshot = await query.limit(50).get();
        const users = [];
        const userIds = new Set();

        // Собираем все ID для получения usernames
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            users.push({
                userId: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date()
            });
            userIds.add(doc.id);
            if (data.invitedBy) {
                userIds.add(data.invitedBy);
            }
        });

        // Получаем usernames для всех пользователей
        const usernames = {};
        for (const userId of userIds) {
            try {
                const user = await bot.getChat(userId);
                usernames[userId] = user.username || null;
            } catch (error) {
                console.error(`Error getting username for ${userId}:`, error);
            }
        }

        // Добавляем usernames к данным пользователей
        users.forEach(user => {
            user.username = usernames[user.userId];
            user.invitedByUsername = usernames[user.invitedBy];
        });

        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Поиск пользователей
router.post('/searchUsers', isAdmin, async (req, res) => {
    const { searchTerm } = req.body;
    if (!searchTerm || searchTerm.length < 2) {
        return res.status(400).json({ error: 'Search term too short' });
    }

    try {
        const usersSnapshot = await db.collection('users')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const users = [];
        const userIds = new Set();

        // Собираем пользователей и их ID
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            users.push({
                userId: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date()
            });
            userIds.add(doc.id);
            if (data.invitedBy) {
                userIds.add(data.invitedBy);
            }
        });

        // Получаем usernames
        const usernames = {};
        for (const userId of userIds) {
            try {
                const user = await bot.getChat(userId);
                usernames[userId] = user.username || null;
            } catch (error) {
                console.error(`Error getting username for ${userId}:`, error);
            }
        }

        // Фильтруем пользователей по username
        const filteredUsers = users.filter(user => {
            const username = usernames[user.userId];
            return username && username.toLowerCase().includes(searchTerm.toLowerCase());
        });

        // Добавляем usernames к данным
        filteredUsers.forEach(user => {
            user.username = usernames[user.userId];
            user.invitedByUsername = usernames[user.invitedBy];
        });

        res.json({
            success: true,
            users: filteredUsers
        });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение реферальной цепочки
router.post('/getReferralChain', isAdmin, async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const chain = [];
        let currentUserId = userId;

        while (currentUserId) {
            const userDoc = await db.collection('users').doc(currentUserId).get();
            if (!userDoc.exists) break;

            const userData = userDoc.data();
            chain.push({
                userId: currentUserId,
                username: null // Будет заполнено позже
            });

            currentUserId = userData.invitedBy;
            if (currentUserId === '795024553') break; // Останавливаемся на админе
        }

        // Получаем usernames для всех пользователей в цепочке
        for (const user of chain) {
            try {
                const chat = await bot.getChat(user.userId);
                user.username = chat.username;
            } catch (error) {
                console.error(`Error getting username for ${user.userId}:`, error);
            }
        }

        res.json({
            success: true,
            chain: chain
        });
    } catch (error) {
        console.error('Get referral chain error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 