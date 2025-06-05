const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();
const crypto = require('crypto');

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

module.exports = router; 