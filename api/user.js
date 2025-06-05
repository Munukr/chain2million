const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { distributeReferralBonus } = require('../utils/bot');

// Upgrade user to paid access
router.post('/upgradeToPaid', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const userRef = admin.firestore().collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        
        if (userData.access !== 'free') {
            return res.status(400).json({ error: 'User already has paid access' });
        }

        // Update user access to paid
        await userRef.update({
            access: 'paid',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Distribute referral bonuses
        await distributeReferralBonus(userId);

        res.json({ 
            success: true, 
            message: 'Successfully upgraded to paid access',
            user: {
                ...userData,
                access: 'paid'
            }
        });

    } catch (error) {
        console.error('Error upgrading user to paid access:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 