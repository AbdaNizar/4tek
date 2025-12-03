// routes/notifications.js
const express = require('express');
const Notification = require('../models/notification');

const router = express.Router();



router.get('/mine', async (req, res) => {
    try {
        const userId = req.user && req.user._id; // à adapter
        if (!userId) {
            return res.status(401).json({ error: 'Unauthenticated' });
        }
        const status = req.query.status || 'ready';

        const notifs = await Notification.find({
            user: userId,
            status,
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        // Option : marquer comme delivered directement
        const ids = notifs.map((n) => n._id);
        if (ids.length) {
            await Notification.updateMany(
                { _id: { $in: ids } },
                { $set: { status: 'delivered', deliveredAt: new Date() } },
            );
        }

        return res.json({ items: notifs });
    } catch (e) {
        console.error('GET /v1/notifications/mine error:', e);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
